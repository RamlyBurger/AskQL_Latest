import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Database } from '../entities/Database';
import { Table } from '../entities/Table';
import { TableData } from '../entities/TableData';
import { parse as csvParse } from 'csv-parse';
import { Readable } from 'stream';
import { Repository } from 'typeorm';
import GeminiController from './GeminiController';
import { DataType, getDefaultValue } from '../types/dataTypes';

export class CSVImportController {
    // Helper function to detect column data type
    private static detectDataType(values: string[]): { type: DataType; confidence: number } {
        // Remove empty values for analysis
        const nonEmptyValues = values.filter(val => val !== null && val !== undefined && val.trim() !== '');
        if (nonEmptyValues.length === 0) return { type: DataType.VARCHAR, confidence: 0.5 };

        // Check for numbers
        const numberValues = nonEmptyValues.filter(val => !isNaN(Number(val)) && val.trim() !== '');
        if (numberValues.length === nonEmptyValues.length) {
            // Check if all numbers are integers
            const allIntegers = numberValues.every(val => Number.isInteger(Number(val)));
            if (allIntegers) {
                return { type: DataType.INTEGER, confidence: 0.9 };
            }
            return { type: DataType.NUMERIC, confidence: 0.9 };
        }

        // Check for dates
        const dateValues = nonEmptyValues.filter(val => !isNaN(Date.parse(val)));
        if (dateValues.length === nonEmptyValues.length) {
            return { type: DataType.TIMESTAMP, confidence: 0.8 };
        }

        // Check for booleans
        const booleanValues = ['true', 'false', '0', '1', 'yes', 'no'];
        const boolCount = nonEmptyValues.filter(val => 
            booleanValues.includes(val.toLowerCase())
        ).length;
        if (boolCount === nonEmptyValues.length) {
            return { type: DataType.BOOLEAN, confidence: 0.9 };
        }

        // Default to VARCHAR
        return { type: DataType.VARCHAR, confidence: 0.7 };
    }

    private static async getNextId(tableDataRepository: Repository<TableData>, tableId: number): Promise<number> {
        const result = await tableDataRepository.find({
            where: { table_id: tableId },
            order: { 
                created_at: 'DESC'
            },
            take: 1
        });

        if (result.length === 0 || !result[0].row_data.id) {
            return 1;
        }

        return (parseInt(result[0].row_data.id) || 0) + 1;
    }

    private static async insertTableDataInBatches(
        tableDataRepository: Repository<TableData>,
        tableData: Partial<TableData>[],
        batchSize: number = 1000
    ): Promise<number> {
        const batches = [];
        for (let i = 0; i < tableData.length; i += batchSize) {
            batches.push(tableData.slice(i, i + batchSize));
        }

        let totalInserted = 0;
        for (const batch of batches) {
            await tableDataRepository.save(batch);
            totalInserted += batch.length;
        }
        return totalInserted;
    }

    static async importCSV(req: Request, res: Response) {
        try {
            console.log('Starting CSV import...');
            console.log('Request body:', req.body);
            console.log('Request file:', req.file);
            
            const databaseId = parseInt(req.params.databaseId);
            const { name, description } = req.body;
            const csvFile = req.file;

            if (!csvFile) {
                console.error('No CSV file provided in request');
                return res.status(400).json({
                    success: false,
                    message: 'No CSV file provided'
                });
            }

            if (!name) {
                console.error('No table name provided');
                return res.status(400).json({
                    success: false,
                    message: 'Table name is required'
                });
            }

            // Parse CSV file
            const records: string[][] = [];
            
            // Read the file buffer as a stream
            const bufferStream = new Readable();
            bufferStream.push(csvFile.buffer);
            bufferStream.push(null);

            // Create parser with proper typing
            const parser = csvParse({
                delimiter: ',',
                skip_empty_lines: true
            });

            // Process the CSV data
            await new Promise((resolve, reject) => {
                bufferStream
                    .pipe(parser)
                    .on('data', (row: string[]) => records.push(row))
                    .on('end', resolve)
                    .on('error', reject);
            });

            if (records.length < 2) {
                console.error('CSV file has insufficient data');
                return res.status(400).json({
                    success: false,
                    message: 'CSV file must contain at least a header row and one data row'
                });
            }

            console.log('CSV parsed successfully. Records:', records.length);

            // First row contains column names
            const columnNames = records[0].map(name => name.trim());
            const dataRows = records.slice(1);

            // Prepare sample data for Gemini
            const sampleData: Record<string, string[]> = {};
            columnNames.forEach((name, index) => {
                sampleData[name] = dataRows.slice(0, 10).map(row => row[index]);
            });

            // Use Gemini to detect column types
            const geminiResult = await new Promise<{
                success: boolean;
                data: Array<{
                    name: string;
                    data_type: string;
                    format?: string;
                    confidence: number;
                    explanation: string;
                }>;
            }>((resolve) => {
                const mockRes = {
                    json: resolve,
                    status: (code: number) => ({
                        json: resolve
                    })
                } as unknown as Response;

                GeminiController.detectColumnTypes({
                    body: { columnNames, sampleData }
                } as Request, mockRes);
            });
            
            if (!geminiResult.success) {
                throw new Error('Failed to detect column types');
            }

            // Create attributes using Gemini's detected types
            const attributes = geminiResult.data.map(column => ({
                name: column.name,
                data_type: column.data_type,
                is_nullable: true,
                is_primary_key: false,
                is_foreign_key: false,
                format: column.format // Store the format for TIMESTAMP columns
            }));

            // Create the table
            const tableRepository = AppDataSource.getRepository(Table);
            const table = await tableRepository.save({
                database_id: databaseId,
                name,
                description,
                attributes
            });

            // Process data rows with auto-incrementing IDs
            const tableData = dataRows.map((row, rowIndex) => {
                const rowData: Record<string, any> = {
                    id: rowIndex + 1
                };
                
                // Convert values based on detected data types
                row.forEach((value, colIndex) => {
                    const columnName = columnNames[colIndex];
                    const attribute = attributes[colIndex];
                    const trimmedValue = typeof value === 'string' ? value.trim() : value;
                    
                    // Handle empty values
                    if (value === null || value === undefined || trimmedValue === '') {
                        rowData[columnName] = null;
                        return;
                    }

                    try {
                        switch (attribute.data_type) {
                            case DataType.INTEGER: {
                                const parsed = parseInt(trimmedValue);
                                rowData[columnName] = isNaN(parsed) ? null : parsed;
                                break;
                            }
                            case DataType.NUMERIC: {
                                const parsed = parseFloat(trimmedValue);
                                rowData[columnName] = isNaN(parsed) ? null : Number(parsed.toFixed(6));
                                break;
                            }
                            case DataType.TIMESTAMP: {
                                let parsed: Date | null = null;
                                
                                // Try parsing with the detected format
                                if (attribute.format) {
                                    try {
                                        // Convert format to moment.js style if needed
                                        const momentFormat = attribute.format
                                            .replace('yyyy', 'YYYY')
                                            .replace('dd', 'DD');
                                        
                                        const date = new Date(trimmedValue);
                                        if (!isNaN(date.getTime())) {
                                            parsed = date;
                                        }
                                    } catch (e) {
                                        console.warn(`Failed to parse date with format ${attribute.format}:`, e);
                                    }
                                }

                                // Fallback to direct parsing if format parsing fails
                                if (!parsed) {
                                    parsed = new Date(trimmedValue);
                                }

                                rowData[columnName] = isNaN(parsed.getTime()) 
                                    ? null 
                                    : parsed.toISOString();
                                break;
                            }
                            case DataType.BOOLEAN: {
                                const normalizedValue = trimmedValue.toLowerCase();
                                if (['true', '1', 'yes', 'y'].includes(normalizedValue)) {
                                    rowData[columnName] = true;
                                } else if (['false', '0', 'no', 'n'].includes(normalizedValue)) {
                                    rowData[columnName] = false;
                                } else {
                                    rowData[columnName] = null;
                                }
                                break;
                            }
                            default:
                                rowData[columnName] = trimmedValue || null;
                        }
                    } catch (error) {
                        console.warn(`Error converting value "${trimmedValue}" to type ${attribute.data_type}:`, error);
                        rowData[columnName] = null;
                    }
                });
                
                return {
                    table_id: table.id,
                    row_data: rowData
                };
            });

            // Save the data in batches
            const tableDataRepository = AppDataSource.getRepository(TableData);
            const totalInserted = await CSVImportController.insertTableDataInBatches(tableDataRepository, tableData);

            return res.status(201).json({
                success: true,
                message: `Table created with ${totalInserted} records`,
                data: {
                    table,
                    recordCount: totalInserted
                }
            });
        } catch (error) {
            console.error('Error importing CSV:', error);
            return res.status(500).json({
                success: false,
                message: 'Error importing CSV file'
            });
        }
    }
} 