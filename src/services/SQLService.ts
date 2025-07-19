import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

export interface SQLResult {
    columns: string[];
    rows: any[];
    columnTypes?: Record<string, string>;
}

class SQLService {
    private static instance: SQLService;
    private SQL: any = null;
    private databases: Map<number, Database> = new Map();

    private constructor() {}

    static getInstance(): SQLService {
        if (!SQLService.instance) {
            SQLService.instance = new SQLService();
        }
        return SQLService.instance;
    }

    async init() {
        if (!this.SQL) {
            try {
                this.SQL = await initSqlJs({
                    locateFile: file => `/sql.js/dist/${file}`
                });
                console.log('SQL.js initialized successfully');
            } catch (error) {
                console.error('Failed to initialize SQL.js:', error);
                throw error;
            }
        }
        return this.SQL;
    }

    // Helper function to escape SQLite identifiers
    private escapeIdentifier(identifier: string): string {
        // Always wrap identifiers in quotes to handle special cases (numbers, keywords, etc.)
        return `"${identifier.toString().replace(/"/g, '""')}"`;
    }

    async createDatabase(databaseId: number, tables: any[]) {
        if (!this.SQL) {
            await this.init();
        }

        // Remove existing database if it exists
        if (this.databases.has(databaseId)) {
            console.log(`Removing existing database ${databaseId}`);
            this.databases.delete(databaseId);
        }

        console.log('Creating new SQLite database with tables:', tables.map(t => ({
            name: t.name,
            attributeCount: t.attributes?.length || 0,
            dataRowCount: t.data?.length || 0
        })));

        const db = new this.SQL.Database();

        // Create tables and insert data
        for (const table of tables) {
            if (!table.attributes || table.attributes.length === 0) {
                console.warn(`Skipping table ${table.name} - no attributes defined`);
                continue;
            }

            try {
                // Create table
                const columns = table.attributes.map((attr: any) => {
                    let sqlType = 'TEXT';
                    switch (attr.data_type.toLowerCase()) {
                        case 'number':
                        case 'integer':
                        case 'int':
                            sqlType = 'INTEGER';
                            break;
                        case 'float':
                        case 'double':
                        case 'decimal':
                        case 'numeric':
                            sqlType = 'REAL';
                            break;
                        case 'boolean':
                            sqlType = 'INTEGER';
                            break;
                        default:
                            sqlType = 'TEXT';
                    }
                    return `${this.escapeIdentifier(attr.name)} ${sqlType}`;
                }).join(', ');

                const createTableSQL = `CREATE TABLE ${this.escapeIdentifier(table.name)} (${columns})`;
                console.log('Creating table with SQL:', createTableSQL);
                db.run(createTableSQL);

                // Insert data if available
                if (table.data && table.data.length > 0) {
                    const columnNames = table.attributes.map((attr: any) => this.escapeIdentifier(attr.name));
                    const placeholders = columnNames.map(() => '?').join(', ');
                    const insertSQL = `INSERT INTO ${this.escapeIdentifier(table.name)} (${columnNames.join(', ')}) VALUES (${placeholders})`;
                    console.log(`Inserting ${table.data.length} rows into table ${table.name}`);
                    console.log('Insert SQL:', insertSQL);

                    const stmt = db.prepare(insertSQL);
                    table.data.forEach((row: any) => {
                        // Extract values from row_data if it exists, otherwise use the row directly
                        const rowData = row.row_data || row;
                        const values = table.attributes.map((attr: any) => {
                            const value = rowData[attr.name];
                            // Convert empty strings to null for non-TEXT columns
                            if ((value === '' || value === undefined || value === null) && attr.data_type.toLowerCase() !== 'text') {
                                return null;
                            }
                            return value;
                        });
                        try {
                            stmt.run(values);
                        } catch (error) {
                            console.error('Error inserting row:', { values, error });
                            throw error;
                        }
                    });
                    stmt.free();
                }

                // Verify table creation
                const verifyResult = db.exec(`SELECT COUNT(*) as count FROM ${this.escapeIdentifier(table.name)}`);
                console.log(`Verification - Table ${table.name} has ${verifyResult[0].values[0][0]} rows`);

                // List all tables in the database
                const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
                console.log('Tables in database:', tables[0].values.map((v: string[]) => v[0]));

            } catch (error) {
                console.error(`Error creating table ${table.name}:`, error);
                throw error;
            }
        }

        this.databases.set(databaseId, db);
        return db;
    }

    async executeQuery(databaseId: number, sql: string): Promise<SQLResult> {
        const db = this.databases.get(databaseId);
        if (!db) {
            throw new Error('Database not initialized. Please load the database first.');
        }

        try {
            console.log('Executing SQL query:', sql);
            
            // Get list of actual table names for case-insensitive matching
            const tableList = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
            const actualTableNames = tableList[0]?.values.map(v => String(v[0])) || [];
            console.log('Available tables:', actualTableNames);

            // Replace table names in query with correct casing
            let modifiedSql = sql;
            actualTableNames.forEach(tableName => {
                const tableRegex = new RegExp(`\\b${tableName}\\b`, 'i');
                modifiedSql = modifiedSql.replace(tableRegex, tableName);
            });

            console.log('Modified SQL query:', modifiedSql);
            const results = db.exec(modifiedSql);
            console.log('Query results:', results);
            
            if (results.length === 0) {
                return { columns: [], rows: [] };
            }

            const columns = results[0].columns;
            // Return the rows directly as objects with column names as keys
            const rows = results[0].values.map(row => {
                const rowObj: any = {};
                columns.forEach((col, i) => {
                    rowObj[col] = row[i];
                });
                return rowObj;
            });

            return { columns, rows };
        } catch (error) {
            console.error('Error executing query:', error);
            throw error;
        }
    }
}

export default SQLService; 