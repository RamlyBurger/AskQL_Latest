import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Database } from '../entities/Database';
import { Table } from '../entities/Table';
import { Attribute } from '../entities/Attribute';
import { TableData } from '../entities/TableData';

// Helper function to log database access
const logDatabaseAccess = async (databaseId: number, action: string) => {
    try {
        // This could be extended to store in a dedicated logging table
        console.log(`Database ${databaseId} - ${action} at ${new Date().toISOString()}`);
    } catch (error) {
        console.error('Error logging database access:', error);
    }
};

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
                        status: totalRows > 10000 ? 'critical' : totalRows > 5000 ? 'warning' : 'healthy',
                        performance: Math.max(100 - Math.floor(totalRows / 100), 10),
                        queries_per_second: Math.floor(totalRows / 1000) || 1, // Based on data volume
                        active_connections: Math.min(tables.length, 10) || 1, // Based on table count
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

            // Log database access
            await logDatabaseAccess(database.id, 'accessed');

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
            
            // Log database creation
            await logDatabaseAccess(database.id, 'created');
            
            res.json({ success: true, data: database });
        } catch (error: any) {
            console.error('Error creating database:', error);
            
            // Handle specific database constraint errors
            if (error.code === '23505') { // PostgreSQL unique constraint violation
                if (error.constraint === 'UQ_4f56ebcf8cba238205136aa00f1' || error.detail?.includes('name')) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `A database with the name "${req.body.name}" already exists. Please choose a different name.` 
                    });
                }
            }
            
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
            
            // Log database update
            await logDatabaseAccess(database.id, 'updated');
            
            res.json({ success: true, data: database });
        } catch (error: any) {
            console.error('Error updating database:', error);
            
            // Handle specific database constraint errors
            if (error.code === '23505') { // PostgreSQL unique constraint violation
                if (error.constraint === 'UQ_4f56ebcf8cba238205136aa00f1' || error.detail?.includes('name')) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `A database with the name "${req.body.name}" already exists. Please choose a different name.` 
                    });
                }
            }
            
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

            // Log database deletion
            await logDatabaseAccess(database.id, 'deleted');
            
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

            // Get today's date range for data operations
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Count table data operations today
            const dataOperationsToday = await tableDataRepo
                .createQueryBuilder('table_data')
                .where('table_data.created_at >= :today', { today })
                .andWhere('table_data.created_at < :tomorrow', { tomorrow })
                .getCount();

            // Count chat messages (queries) today
            let queriesToday = 0;
            try {
                const queryResult = await AppDataSource.query(`
                    SELECT COUNT(*) as count 
                    FROM "chat_message" 
                    WHERE "created_at" >= $1 AND "created_at" < $2
                `, [today, tomorrow]);
                queriesToday = parseInt(queryResult[0]?.count || '0');
            } catch (chatError) {
                // If chat_message table doesn't exist or has no data, use data operations
                queriesToday = dataOperationsToday;
            }

            // Calculate actual database connections (approximation based on tables per database)
            const databases = await databaseRepo.find({ relations: ['tables'] });
            const activeConnections = Math.max(
                databases.reduce((total, db) => total + Math.min(db.tables?.length || 0, 5), 0),
                1
            );

            // For average response time, we'll start with a base value
            // This will be updated by frontend localStorage tracking
            const avgResponseTime = '45.5'; // Base value, will be overridden by frontend

            const statistics = {
                total_databases: totalDatabases,
                total_tables: totalTables,
                total_size: `${totalSizeGB} GB`,
                active_connections: activeConnections,
                queries_today: queriesToday,
                avg_response_time: `${avgResponseTime}ms`,
                total_rows: totalRows,
                data_operations_today: dataOperationsToday
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
                status: totalRows > 10000 ? 'critical' : totalRows > 5000 ? 'warning' : 'healthy',
                performance: Math.max(100 - Math.floor(totalRows / 1000), 10),
                queries_per_second: Math.floor(totalRows / 1000) || 1,
                active_connections: Math.min(tables.length, 10) || 1,
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