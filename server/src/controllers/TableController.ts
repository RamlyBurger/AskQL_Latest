import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Table } from '../entities/Table';
import { Database } from '../entities/Database';
import { Attribute } from '../entities/Attribute';
import { PostgresError } from '../types/errors';
import { DataType, isValidDataType } from '../types/dataTypes';

export class TableController {
    private tableRepository = AppDataSource.getRepository(Table);
    private databaseRepository = AppDataSource.getRepository(Database);
    private attributeRepository = AppDataSource.getRepository(Attribute);

    // Get tables by database ID
    async getTablesByDatabaseId(req: Request, res: Response) {
        try {
            const { databaseId } = req.params;
            const tables = await this.tableRepository.find({
                where: { database: { id: parseInt(databaseId) } },
                relations: ['attributes'],
                order: { created_at: 'DESC' }
            });

            return res.json({
                success: true,
                data: tables
            });
        } catch (error) {
            console.error('Error fetching tables:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching tables'
            });
        }
    }

    // Create new table
    async createTable(req: Request, res: Response) {
        try {
            const { databaseId } = req.params;
            const { name, description, attributes } = req.body;

            const database = await this.databaseRepository.findOne({
                where: { id: parseInt(databaseId) }
            });

            if (!database) {
                return res.status(404).json({
                    success: false,
                    message: 'Database not found'
                });
            }

            // Validate attributes
            if (attributes && Array.isArray(attributes)) {
                // Check for duplicate column names
                const columnNames = attributes.map(attr => attr.name.toLowerCase());
                const duplicateColumns = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
                if (duplicateColumns.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Duplicate column names found: ${duplicateColumns.join(', ')}`
                    });
                }

                // Validate data types
                const invalidTypes = attributes
                    .filter(attr => !isValidDataType(attr.data_type))
                    .map(attr => `${attr.name}: ${attr.data_type}`);

                if (invalidTypes.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid data types found: ${invalidTypes.join(', ')}. Valid types are: ${Object.values(DataType).join(', ')}`
                    });
                }
            }

            // Create table first
            const table = this.tableRepository.create({
                name,
                description,
                database,
                database_id: database.id
            });

            const savedTable = await this.tableRepository.save(table);

            // Create attributes if provided
            if (attributes && Array.isArray(attributes)) {
                const attributePromises = attributes.map(attr => {
                    const attribute = this.attributeRepository.create({
                        name: attr.name,
                        data_type: attr.data_type,
                        is_nullable: attr.is_nullable,
                        is_primary_key: attr.is_primary_key,
                        is_foreign_key: attr.is_foreign_key,
                        table: savedTable
                    });
                    return this.attributeRepository.save(attribute);
                });

                await Promise.all(attributePromises);
            }

            // Fetch the complete table with attributes
            const completeTable = await this.tableRepository.findOne({
                where: { id: savedTable.id },
                relations: ['attributes']
            });

            return res.status(201).json({
                success: true,
                data: completeTable
            });
        } catch (error) {
            console.error('Error creating table:', error);
            
            // Check for unique constraint violation
            if ((error as PostgresError).code === '23505') {
                return res.status(400).json({
                    success: false,
                    message: 'A table with this name already exists in this database'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Error creating table'
            });
        }
    }

    // Get single table by ID
    async getTableById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const table = await this.tableRepository.findOne({
                where: { id: parseInt(id) },
                relations: ['attributes']
            });

            if (!table) {
                return res.status(404).json({
                    success: false,
                    error: 'Table not found'
                });
            }

            res.json({
                success: true,
                data: table
            });
        } catch (error) {
            console.error('Error fetching table:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch table'
            });
        }
    }

    // Update table
    async updateTable(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, description, attributes } = req.body;

            const table = await this.tableRepository.findOne({
                where: { id: parseInt(id) },
                relations: ['attributes']
            });

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: 'Table not found'
                });
            }

            // Validate attributes
            if (attributes && Array.isArray(attributes)) {
                // Check for duplicate column names
                const columnNames = attributes.map(attr => attr.name.toLowerCase());
                const duplicateColumns = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
                if (duplicateColumns.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Duplicate column names found: ${duplicateColumns.join(', ')}`
                    });
                }

                // Validate data types
                const invalidTypes = attributes
                    .filter(attr => !isValidDataType(attr.data_type))
                    .map(attr => `${attr.name}: ${attr.data_type}`);

                if (invalidTypes.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid data types found: ${invalidTypes.join(', ')}. Valid types are: ${Object.values(DataType).join(', ')}`
                    });
                }
            }

            // Update table basic info
            table.name = name || table.name;
            table.description = description || table.description;

            // Delete existing attributes
            if (table.attributes) {
                await this.attributeRepository.remove(table.attributes);
            }

            // Save updated table
            const savedTable = await this.tableRepository.save(table);

            // Create new attributes
            if (attributes && Array.isArray(attributes)) {
                const attributePromises = attributes.map(attr => {
                    const attribute = this.attributeRepository.create({
                        name: attr.name,
                        data_type: attr.data_type,
                        is_nullable: attr.is_nullable,
                        is_primary_key: attr.is_primary_key,
                        is_foreign_key: attr.is_foreign_key,
                        table: savedTable
                    });
                    return this.attributeRepository.save(attribute);
                });

                await Promise.all(attributePromises);
            }

            // Fetch the complete updated table with attributes
            const completeTable = await this.tableRepository.findOne({
                where: { id: savedTable.id },
                relations: ['attributes']
            });

            return res.json({
                success: true,
                data: completeTable
            });
        } catch (error) {
            console.error('Error updating table:', error);
            
            // Check for unique constraint violation
            if ((error as PostgresError).code === '23505') {
                return res.status(400).json({
                    success: false,
                    message: 'A table with this name already exists in this database'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Error updating table'
            });
        }
    }

    // Delete table
    async deleteTable(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const table = await this.tableRepository.findOne({
                where: { id: parseInt(id) }
            });

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: 'Table not found'
                });
            }

            await this.tableRepository.remove(table);

            return res.json({
                success: true,
                message: 'Table deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting table:', error);
            return res.status(500).json({
                success: false,
                message: 'Error deleting table'
            });
        }
    }
} 