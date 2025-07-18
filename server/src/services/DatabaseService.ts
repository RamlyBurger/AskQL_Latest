import { AppDataSource } from '../config/database';
import { Database } from '../entities/Database';
import { Table } from '../entities/Table';
import { TableData } from '../entities/TableData';
import { Attribute } from '../entities/Attribute';

export class DatabaseService {
    private static tableDataRepository = AppDataSource.getRepository(TableData);
    private static tableRepository = AppDataSource.getRepository(Table);
    private static attributeRepository = AppDataSource.getRepository(Attribute);
    private static databaseRepository = AppDataSource.getRepository(Database);

    static async getTableData(
        tableId: number,
        page: number = 1,
        pageSize: number = 10,
        sortColumn?: string,
        sortOrder?: 'asc' | 'desc',
        showTopN?: number
    ): Promise<any> {
        try {
            // Get table with attributes to know the data types
            const table = await this.tableRepository.findOne({
                where: { id: tableId },
                relations: ['attributes']
            });

            if (!table) {
                throw new Error('Table not found');
            }

            // Create a map of column names to their data types
            const columnTypes = new Map(
                table.attributes.map(attr => [attr.name, attr.data_type])
            );

            // Get all data for the table
            const allData = await this.tableDataRepository.find({
                where: { table_id: tableId },
                order: { id: 'ASC' }
            });

            // Process and sort the data
            let processedData = allData.map(row => ({
                ...row,
                row_data: Object.fromEntries(
                    Object.entries(row.row_data).map(([key, value]) => {
                        const dataType = columnTypes.get(key) || 'varchar';
                        return [key, this.parseValueByType(value, dataType)];
                    })
                )
            }));

            // Sort data if requested
            if (sortColumn && columnTypes.has(sortColumn)) {
                const dataType = columnTypes.get(sortColumn) || 'varchar';
                processedData.sort((a, b) => {
                    const valueA = a.row_data[sortColumn];
                    const valueB = b.row_data[sortColumn];
                    const comparison = this.compareValues(valueA, valueB, dataType);
                    return sortOrder === 'desc' ? -comparison : comparison;
                });
            }

            // Apply pagination or top N
            const skip = showTopN ? 0 : (page - 1) * pageSize;
            const total = processedData.length;
            const parsedPageSize = showTopN ? showTopN : pageSize;

            if (showTopN) {
                processedData = processedData.slice(0, parsedPageSize);
            } else {
                processedData = processedData.slice(skip, skip + parsedPageSize);
            }

            return {
                data: processedData,
                total,
                page,
                pageSize: parsedPageSize,
                columnTypes: Object.fromEntries(columnTypes)
            };
        } catch (error) {
            console.error('Error in getTableData:', error);
            throw error;
        }
    }

    private static parseValueByType(value: any, dataType: string): any {
        if (value === null || value === undefined) return null;
        
        switch (dataType.toLowerCase()) {
            case 'integer':
            case 'int':
                return parseInt(value);
            case 'numeric':
            case 'decimal':
            case 'float':
            case 'double':
                return parseFloat(value);
            case 'timestamp':
            case 'datetime':
            case 'date':
                return new Date(value).getTime();
            case 'boolean':
                return Boolean(value);
            default:
                return String(value);
        }
    }

    private static compareValues(a: any, b: any, dataType: string): number {
        const parsedA = this.parseValueByType(a, dataType);
        const parsedB = this.parseValueByType(b, dataType);

        // Handle null/undefined values
        if (parsedA === null && parsedB === null) return 0;
        if (parsedA === null) return 1;
        if (parsedB === null) return -1;

        // Compare based on parsed values
        if (parsedA < parsedB) return -1;
        if (parsedA > parsedB) return 1;
        return 0;
    }
} 