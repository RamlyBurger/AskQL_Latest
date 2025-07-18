import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Database } from '../entities/Database';
import { Table } from '../entities/Table';
import { Attribute } from '../entities/Attribute';
import { TableData } from '../entities/TableData';

export class DatabaseController {
    static async getAllDatabases(req: Request, res: Response) {
        try {
            const databases = await AppDataSource.getRepository(Database).find({
                relations: ['tables']
            });
            res.json({ success: true, data: databases });
        } catch (error) {
            console.error('Error fetching databases:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch databases' });
        }
    }

    static async getDatabaseById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const database = await AppDataSource.getRepository(Database).findOne({
                where: { id: parseInt(id) },
                relations: ['tables']
            });

            if (!database) {
                return res.status(404).json({
                    success: false,
                    message: 'Database not found'
                });
            }

            res.json({ success: true, data: database });
        } catch (error) {
            console.error('Error fetching database:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch database' });
        }
    }

    static async createDatabase(req: Request, res: Response) {
        try {
            const { name, description, database_type } = req.body;

            // Validate required fields
            if (!name || !database_type) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and database type are required'
                });
            }

            const database = AppDataSource.getRepository(Database).create({
                name,
                description,
                database_type
            });

            await AppDataSource.getRepository(Database).save(database);
            res.json({ success: true, data: database });
        } catch (error) {
            console.error('Error creating database:', error);
            res.status(500).json({ success: false, message: 'Failed to create database' });
        }
    }

    static async updateDatabase(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, description, database_type } = req.body;

            const database = await AppDataSource.getRepository(Database).findOneBy({ id: parseInt(id) });
            if (!database) {
                return res.status(404).json({
                    success: false,
                    message: 'Database not found'
                });
            }

            // Update fields
            if (name) database.name = name;
            if (description) database.description = description;
            if (database_type) database.database_type = database_type;

            await AppDataSource.getRepository(Database).save(database);
            res.json({ success: true, data: database });
        } catch (error) {
            console.error('Error updating database:', error);
            res.status(500).json({ success: false, message: 'Failed to update database' });
        }
    }

    static async deleteDatabase(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const database = await AppDataSource.getRepository(Database).findOneBy({ id: parseInt(id) });

            if (!database) {
                return res.status(404).json({
                    success: false,
                    message: 'Database not found'
                });
            }

            await AppDataSource.getRepository(Database).remove(database);
            res.json({ success: true, message: 'Database deleted successfully' });
        } catch (error) {
            console.error('Error deleting database:', error);
            res.status(500).json({ success: false, message: 'Failed to delete database' });
        }
    }

    static async resetDatabase(req: Request, res: Response) {
        try {
            // Get all tables
            const tables = await AppDataSource.getRepository(Table).find();
            
            // Delete all data from tables
            for (const table of tables) {
                await AppDataSource.getRepository(TableData).delete({ table_id: table.id });
                await AppDataSource.getRepository(Attribute).delete({ table_id: table.id });
            }
            
            // Delete all tables
            await AppDataSource.getRepository(Table).clear();
            
            // Delete all databases
            await AppDataSource.getRepository(Database).clear();
            
            res.json({
                success: true,
                message: 'Database reset successfully'
            });
        } catch (error) {
            console.error('Error resetting database:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reset database'
            });
        }
    }
} 