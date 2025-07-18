import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Database, DatabaseType } from '../entities/Database';
import { Table } from '../entities/Table';
import { Attribute } from '../entities/Attribute';
import { TableData } from '../entities/TableData';
import { In } from 'typeorm';

export class DatabaseController {
    private databaseRepository = AppDataSource.getRepository(Database);
    private tableRepository = AppDataSource.getRepository(Table);
    private attributeRepository = AppDataSource.getRepository(Attribute);
    private tableDataRepository = AppDataSource.getRepository(TableData);

    // Get all databases
    async getAllDatabases(req: Request, res: Response) {
        try {
            const databases = await this.databaseRepository.find({
                relations: ['tables']
            });
            res.json({
                success: true,
                data: databases
            });
        } catch (error) {
            console.error('Error fetching databases:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch databases'
            });
        }
    }

    // Get database by ID
    async getDatabaseById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const database = await this.databaseRepository.findOne({
                where: { id: parseInt(id) },
                relations: ['tables', 'tables.attributes']
            });

            if (!database) {
                return res.status(404).json({
                    success: false,
                    error: 'Database not found'
                });
            }

            res.json({
                success: true,
                data: database
            });
        } catch (error) {
            console.error('Error fetching database:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch database'
            });
        }
    }

    // Create database
    async createDatabase(req: Request, res: Response) {
        try {
            const { name, description, database_type } = req.body;

            // Validate input
            if (!name || !database_type) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and database_type are required'
                });
            }

            // Check if database type is valid
            if (!Object.values(DatabaseType).includes(database_type as DatabaseType)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid database type'
                });
            }

            // Create database
            const database = this.databaseRepository.create({
                name,
                description,
                database_type
            });

            await this.databaseRepository.save(database);

            res.status(201).json({
                success: true,
                data: database
            });
        } catch (error) {
            console.error('Error creating database:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create database'
            });
        }
    }

    // Update database
    async updateDatabase(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, description, database_type } = req.body;

            const database = await this.databaseRepository.findOne({
                where: { id: parseInt(id) }
            });

            if (!database) {
                return res.status(404).json({
                    success: false,
                    error: 'Database not found'
                });
            }

            // Update fields if provided
            database.name = name || database.name;
            database.description = description || database.description;
            database.database_type = database_type || database.database_type;

            await this.databaseRepository.save(database);

            res.json({
                success: true,
                data: database
            });
        } catch (error) {
            console.error('Error updating database:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update database'
            });
        }
    }

    // Delete database
    async deleteDatabase(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const database = await this.databaseRepository.findOne({
                where: { id: parseInt(id) }
            });

            if (!database) {
                return res.status(404).json({
                    success: false,
                    error: 'Database not found'
                });
            }

            await this.databaseRepository.remove(database);

            res.json({
                success: true,
                message: 'Database deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting database:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete database'
            });
        }
    }
} 