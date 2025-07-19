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

            // Enhance each database with statistics
            const enhancedDatabases = await Promise.all(
                databases.map(async (database) => {
                    const tableRepo = AppDataSource.getRepository(Table);
                    const tableDataRepo = AppDataSource.getRepository(TableData);

                    // Get tables for this database
                    const tables = await tableRepo.find({
                        where: { database_id: database.id }
                    });

                    // Calculate total rows for this database
                    let totalRows = 0;
                    for (const table of tables) {
                        const rowCount = await tableDataRepo.count({
                            where: { table_id: table.id }
                        });
                        totalRows += rowCount;
                    }

                    // Calculate approximate size (1KB per row average)
                    const sizeGB = (totalRows * 1024 / (1024 * 1024 * 1024)).toFixed(2);

                    return {
                        ...database,
                        size: `${sizeGB} GB`,
                        status: totalRows > 10000 ? 'warning' : totalRows > 5000 ? 'warning' : 'healthy',
                        performance: Math.max(100 - Math.floor(totalRows / 100), 10),
                        queries_per_second: Math.floor(Math.random() * 50) + Math.floor(totalRows / 10),
                        active_connections: Math.floor(Math.random() * 10) + Math.floor(tables.length / 2),
                        table_count: tables.length,
                        row_count: totalRows
                    };
                })
            );

            res.json({ success: true, data: enhancedDatabases });
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

    static async getStatistics(req: Request, res: Response) {
        try {
            const databaseRepo = AppDataSource.getRepository(Database);
            const tableRepo = AppDataSource.getRepository(Table);
            const tableDataRepo = AppDataSource.getRepository(TableData);

            // Get total databases count
            const totalDatabases = await databaseRepo.count();

            // Get total tables count
            const totalTables = await tableRepo.count();

            // Calculate total data size (number of rows across all tables)
            const totalRows = await tableDataRepo.count();
            
            // Convert rows to approximate size (assuming average of 1KB per row)
            const totalSizeGB = (totalRows * 1024 / (1024 * 1024 * 1024)).toFixed(2);

            // Get today's date range for queries
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Count table data created today (as a proxy for queries)
            const queriesToday = await tableDataRepo
                .createQueryBuilder('table_data')
                .where('table_data.created_at >= :today', { today })
                .andWhere('table_data.created_at < :tomorrow', { tomorrow })
                .getCount();

            // Mock some values that would require actual database monitoring
            const activeConnections = Math.floor(Math.random() * 50) + 10; // 10-60
            const avgResponseTime = (Math.random() * 50 + 10).toFixed(2); // 10-60ms

            const statistics = {
                total_databases: totalDatabases,
                total_tables: totalTables,
                total_size: `${totalSizeGB} GB`,
                active_connections: activeConnections,
                queries_today: queriesToday,
                avg_response_time: `${avgResponseTime}ms`
            };

            res.json({ success: true, data: statistics });
        } catch (error) {
            console.error('Error fetching statistics:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
        }
    }

    static async getDatabaseWithStats(req: Request, res: Response) {
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

            // Calculate database-specific stats
            const tableRepo = AppDataSource.getRepository(Table);
            const tableDataRepo = AppDataSource.getRepository(TableData);

            // Get tables for this database
            const tables = await tableRepo.find({
                where: { database_id: database.id }
            });

            // Calculate total rows for this database
            let totalRows = 0;
            for (const table of tables) {
                const rowCount = await tableDataRepo.count({
                    where: { table_id: table.id }
                });
                totalRows += rowCount;
            }

            // Calculate approximate size (1KB per row average)
            const sizeGB = (totalRows * 1024 / (1024 * 1024 * 1024)).toFixed(2);

            // Add calculated stats to database object
            const enhancedDatabase = {
                ...database,
                size: `${sizeGB} GB`,
                status: totalRows > 10000 ? 'warning' : 'healthy',
                performance: Math.max(100 - Math.floor(totalRows / 1000), 10),
                queries_per_second: Math.floor(Math.random() * 100) + totalRows,
                active_connections: Math.floor(Math.random() * 20) + 1,
                table_count: tables.length,
                row_count: totalRows
            };

            res.json({ success: true, data: enhancedDatabase });
        } catch (error) {
            console.error('Error fetching database with stats:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch database' });
        }
    }
}