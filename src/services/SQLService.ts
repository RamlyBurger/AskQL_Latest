import initSqlJs, { Database } from 'sql.js';

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

    async createDatabase(databaseId: number, tables: any[]) {
        if (!this.SQL) {
            await this.init();
        }

        if (this.databases.has(databaseId)) {
            return this.databases.get(databaseId)!;
        }

        const db = new this.SQL.Database();

        // Create tables and insert data
        for (const table of tables) {
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
                        sqlType = 'REAL';
                        break;
                    case 'boolean':
                        sqlType = 'INTEGER';
                        break;
                    default:
                        sqlType = 'TEXT';
                }
                return `${attr.name} ${sqlType}`;
            }).join(', ');

            const createTableSQL = `CREATE TABLE ${table.name} (${columns})`;
            console.log('Creating table with SQL:', createTableSQL);
            db.run(createTableSQL);

            // Insert data if available
            if (table.data && table.data.length > 0) {
                const columnNames = table.attributes.map((attr: any) => attr.name);
                const placeholders = columnNames.map(() => '?').join(', ');
                const insertSQL = `INSERT INTO ${table.name} (${columnNames.join(', ')}) VALUES (${placeholders})`;
                console.log('Inserting data with SQL:', insertSQL);

                const stmt = db.prepare(insertSQL);
                table.data.forEach((row: any) => {
                    // Extract values from row_data for each column
                    const values = columnNames.map(col => row.row_data ? row.row_data[col] : row[col]);
                    console.log('Inserting row values:', values);
                    stmt.run(values);
                });
                stmt.free();
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
            const results = db.exec(sql);
            console.log('Query results:', results);
            
            if (results.length === 0) {
                return { columns: [], rows: [] };
            }

            const columns = results[0].columns;
            const rows = results[0].values.map((row, index) => ({
                id: index,
                row_data: Object.fromEntries(columns.map((col, i) => [col, row[i]]))
            }));

            return { columns, rows };
        } catch (error) {
            console.error('Error executing query:', error);
            throw error;
        }
    }
}

export default SQLService; 