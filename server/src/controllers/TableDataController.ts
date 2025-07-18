import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { TableData } from '../entities/TableData';
import { Table } from '../entities/Table';
import { Attribute } from '../entities/Attribute';
import { Database } from '../entities/Database';
import type { SqlJsStatic, Database as SQLiteDB } from 'sql.js';
import path from 'path';

interface SQLiteResult {
    columns: string[];
    values: any[][];
}

export class TableDataController {
    private tableDataRepository: Repository<TableData>;
    private tableRepository: Repository<Table>;
    private attributeRepository: Repository<Attribute>;
    private databaseRepository: Repository<Database>;
    private SQL: SqlJsStatic | null = null;
    private dbCache: Map<number, SQLiteDB> = new Map();

    constructor() {
        this.tableDataRepository = AppDataSource.getRepository(TableData);
        this.tableRepository = AppDataSource.getRepository(Table);
        this.attributeRepository = AppDataSource.getRepository(Attribute);
        this.databaseRepository = AppDataSource.getRepository(Database);
    }

    private async initSQLite() {
        if (this.SQL) return;

        try {
            const initSqlJs = (await import('sql.js')).default;
            this.SQL = await initSqlJs({
                locateFile: (filename: string) => path.join(__dirname, '..', '..', 'public', filename)
            });
            console.log('SQL.js initialized successfully');
        } catch (error) {
            console.error('Failed to initialize SQL.js:', error);
            throw error;
        }
    }

    private async getOrCreateSQLiteDB(databaseId: number): Promise<SQLiteDB> {
        if (!this.SQL) {
            await this.initSQLite();
        }

        if (this.dbCache.has(databaseId)) {
            return this.dbCache.get(databaseId)!;
        }

        // Get database with tables and their attributes
        const database = await this.databaseRepository.findOne({
            where: { id: databaseId },
            relations: ['tables', 'tables.attributes']
        });

        if (!database) {
            throw new Error('Database not found');
        }

        // Create new SQLite database
        const db = new this.SQL!.Database();

        // Create tables and insert data
        for (const table of database.tables) {
            try {
                // Get table data
                const tableData = await this.tableDataRepository.find({
                    where: { table_id: table.id },
                    order: { id: 'ASC' }
                });

                // Get column definitions
                const columns = table.attributes.map(attr => {
                    let sqlType = 'TEXT';
                    switch (attr.data_type.toLowerCase()) {
                        case 'integer':
                        case 'int':
                        case 'number':
                            sqlType = 'INTEGER';
                            break;
                        case 'numeric':
                        case 'decimal':
                        case 'float':
                        case 'double':
                            sqlType = 'REAL';
                            break;
                        case 'boolean':
                            sqlType = 'INTEGER';
                            break;
                        default:
                            sqlType = 'TEXT';
                    }
                    return `${this.escapeIdentifier(attr.name)} ${sqlType}`;
                });

                // Create table
                const createTableSQL = `CREATE TABLE ${this.escapeIdentifier(table.name)} (${columns.join(', ')})`;
                console.log('Creating table:', createTableSQL);
                db.run(createTableSQL);

                // Insert data
                if (tableData.length > 0) {
                    const columnNames = table.attributes.map(attr => this.escapeIdentifier(attr.name));
                    const placeholders = columnNames.map(() => '?').join(', ');
                    const insertSQL = `INSERT INTO ${this.escapeIdentifier(table.name)} (${columnNames.join(', ')}) VALUES (${placeholders})`;
                    console.log('Inserting data with SQL:', insertSQL);

                    const stmt = db.prepare(insertSQL);
                    tableData.forEach(row => {
                        const values = table.attributes.map(attr => row.row_data[attr.name]);
                        stmt.run(values);
                    });
                    stmt.free();
                }
            } catch (error) {
                console.error(`Error creating table ${table.name}:`, error);
                throw error;
            }
        }

        this.dbCache.set(databaseId, db);
        return db;
    }

    // Helper function to get the next available ID for a table
    private async getNextId(tableId: number): Promise<number> {
        const result = await this.tableDataRepository.find({
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

    // Helper function to parse value based on data type
    private parseValueByType(value: any, dataType: string): any {
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

    // Helper function to compare values based on data type
    private compareValues(a: any, b: any, dataType: string): number {
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

    // Get data samples for a table
    async getTableData(req: Request, res: Response) {
        try {
            const { tableId } = req.params;
            const { page = 1, pageSize = 10, sortColumn, sortOrder, showTopN } = req.query;

            const parsedPage = parseInt(page as string);
            const parsedPageSize = showTopN ? parseInt(showTopN as string) : Math.min(parseInt(pageSize as string), 100);
            const skip = showTopN ? 0 : (parsedPage - 1) * parsedPageSize;

            // Get table with attributes to know the data types
            const table = await this.tableRepository.findOne({
                where: { id: parseInt(tableId) },
                relations: ['attributes']
            });

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: 'Table not found'
                });
            }

            // Create a map of column names to their data types
            const columnTypes = new Map(
                table.attributes.map(attr => [attr.name, attr.data_type])
            );

            // Get all data for the table
            const allData = await this.tableDataRepository.find({
                where: { table_id: parseInt(tableId) },
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
            if (sortColumn && columnTypes.has(sortColumn as string)) {
                const dataType = columnTypes.get(sortColumn as string) || 'varchar';
                processedData.sort((a, b) => {
                    const valueA = a.row_data[sortColumn as string];
                    const valueB = b.row_data[sortColumn as string];
                    const comparison = this.compareValues(valueA, valueB, dataType);
                    return sortOrder === 'desc' ? -comparison : comparison;
                });
            }

            // Apply pagination or top N
            const total = processedData.length;
            if (showTopN) {
                processedData = processedData.slice(0, parsedPageSize);
            } else {
                processedData = processedData.slice(skip, skip + parsedPageSize);
            }

            return res.json({
                success: true,
                data: {
                    data: processedData,
                    total,
                    page: parsedPage,
                    pageSize: parsedPageSize,
                    columnTypes: Object.fromEntries(columnTypes)
                }
            });
        } catch (error) {
            console.error('Error fetching table data:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching table data'
            });
        }
    }

    // Store data samples for a table
    async storeTableData(req: Request, res: Response) {
        try {
            const { tableId } = req.params;
            const { data } = req.body;

            // Validate input
            if (!Array.isArray(data)) {
                return res.status(400).json({
                    success: false,
                    message: 'Data must be an array of records'
                });
            }

            const table = await this.tableRepository.findOne({
                where: { id: parseInt(tableId) }
            });

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: 'Table not found'
                });
            }

            // Get the next available ID
            let nextId = await this.getNextId(parseInt(tableId));

            // Create table data entries with auto-incrementing IDs
            const parsedTableId = parseInt(tableId);
            const tableDataEntries = data.map(row_data => {
                const entryWithId = {
                    ...row_data,
                    id: nextId++
                };
                return {
                    table_id: parsedTableId,
                    row_data: entryWithId
                };
            });

            const savedEntries = await this.tableDataRepository.save(tableDataEntries);

            return res.status(201).json({
                success: true,
                message: `${savedEntries.length} records stored successfully`,
                data: savedEntries
            });
        } catch (error) {
            console.error('Error storing table data:', error);
            return res.status(500).json({
                success: false,
                message: 'Error storing table data'
            });
        }
    }

    // Update a single row of data
    async updateTableDataRow(req: Request, res: Response) {
        try {
            const { tableId, rowId } = req.params;
            const { row_data } = req.body;

            // Find the existing row
            const row = await this.tableDataRepository.findOne({
                where: { 
                    id: parseInt(rowId),
                    table_id: parseInt(tableId)
                }
            });

            if (!row) {
                return res.status(404).json({
                    success: false,
                    message: 'Data row not found'
                });
            }

            // Preserve the existing ID when updating
            const updatedRowData = {
                ...row_data,
                id: row.row_data.id // Keep the existing ID
            };

            // Update the row data
            row.row_data = updatedRowData;
            const updatedRow = await this.tableDataRepository.save(row);

            return res.json({
                success: true,
                data: updatedRow
            });
        } catch (error) {
            console.error('Error updating table data row:', error);
            return res.status(500).json({
                success: false,
                message: 'Error updating table data row'
            });
        }
    }

    // Delete a single row of data by ID
    async deleteTableDataRow(req: Request, res: Response) {
        try {
            const { tableId, rowId } = req.params;

            const row = await this.tableDataRepository.findOne({
                where: { 
                    id: parseInt(rowId),
                    table_id: parseInt(tableId)
                }
            });

            if (!row) {
                return res.status(404).json({
                    success: false,
                    message: 'Data row not found'
                });
            }

            await this.tableDataRepository.remove(row);

            return res.json({
                success: true,
                message: 'Data row deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting table data row:', error);
            return res.status(500).json({
                success: false,
                message: 'Error deleting table data row'
            });
        }
    }

    // Delete all data for a table
    async deleteAllTableData(req: Request, res: Response) {
        try {
            const { tableId } = req.params;

            const result = await this.tableDataRepository.delete({ table_id: parseInt(tableId) });

            return res.json({
                success: true,
                message: `${result.affected || 0} records deleted successfully`
            });
        } catch (error) {
            console.error('Error deleting table data:', error);
            return res.status(500).json({
                success: false,
                message: 'Error deleting table data'
            });
        }
    }

    private escapeIdentifier(identifier: string): string {
        return `"${identifier.replace(/"/g, '""')}"`;
    }

    async executeQuery(req: Request, res: Response) {
        try {
            const { sql, databaseId } = req.body;
            console.log('Received query request:', { sql, databaseId });

            if (!sql || !databaseId) {
                console.log('Missing required parameters');
                return res.status(400).json({ error: 'SQL query and database ID are required' });
            }

            try {
                console.log('Getting SQLite DB for database:', databaseId);
                const db = await this.getOrCreateSQLiteDB(databaseId);
                
                // Get table name from query
                const tableMatch = sql.match(/from\s+(\w+)/i);
                if (!tableMatch) {
                    return res.status(400).json({ error: 'Could not determine table name from query' });
                }
                const tableName = tableMatch[1];

                // Modify the query to use escaped table name
                const modifiedSql = sql.replace(
                    new RegExp(`from\\s+${tableName}`, 'i'),
                    `FROM ${this.escapeIdentifier(tableName)}`
                );
                
                console.log('Executing SQL query:', modifiedSql);
                const results: SQLiteResult[] = db.exec(modifiedSql);
                console.log('Query results:', results);

                if (results.length === 0) {
                    console.log('No results returned');
                    return res.json({
                        columns: [],
                        rows: []
                    });
                }

                const columns = results[0].columns;
                const rows = results[0].values.map((row: any[], index: number) => {
                    const rowData: Record<string, any> = {};
                    columns.forEach((col: string, colIndex: number) => {
                        rowData[col] = row[colIndex];
                    });
                    return {
                        id: index,
                        row_data: rowData
                    };
                });

                const response = { columns, rows };
                console.log('Sending response:', response);
                return res.json(response);
            } catch (error: any) {
                console.error('Error executing SQL:', error);
                return res.status(400).json({ error: error.message });
            }
        } catch (error: any) {
            console.error('Error in query execution:', error);
            return res.status(500).json({ error: 'Failed to execute query' });
        }
    }

    private executeSQLOnData(sql: string, tablesData: { tableName: string, data: any[] }[]): any[] {
        // Convert SQL to lowercase for easier parsing
        sql = sql.toLowerCase().trim();
        console.log('Processing SQL:', sql);

        // Extract the base components of the SQL query
        const components = this.parseSQL(sql);
        console.log('Parsed components:', components);

        // Find the target table data
        const tableData = tablesData.find(t => t.tableName.toLowerCase() === components.table.toLowerCase());
        if (!tableData) {
            throw new Error(`Table ${components.table} not found`);
        }

        let result = [...tableData.data];
        console.log(`Processing ${result.length} rows`);

        // Handle aggregations and special functions
        if (components.isAggregation) {
            result = this.handleAggregation(result, components);
            console.log('Aggregation result:', result);
        }

        return result;
    }

    private parseSQL(sql: string): {
        columns: string;
        table: string;
        where: string;
        groupBy: string;
        orderBy: string;
        limit: string;
        isAggregation: boolean;
    } {
        const components = {
            columns: '*',
            table: '',
            where: '',
            groupBy: '',
            orderBy: '',
            limit: '',
            isAggregation: false
        };

        // Check for aggregation functions
        const aggFunctions = ['count', 'sum', 'avg', 'min', 'max'];
        components.isAggregation = aggFunctions.some(fn => sql.includes(fn + '('));

        // Extract basic parts using a more flexible regex
        const selectMatch = sql.match(/select\s+(.*?)\s+from\s+(\w+)/i);
        if (selectMatch) {
            components.columns = selectMatch[1].trim();
            components.table = selectMatch[2].trim();
        }

        // Extract WHERE clause
        const whereMatch = sql.match(/where\s+(.*?)(?:\s+(?:group by|order by|limit)\s+|$)/i);
        if (whereMatch) {
            components.where = whereMatch[1].trim();
        }

        // Extract GROUP BY clause
        const groupMatch = sql.match(/group by\s+(.*?)(?:\s+(?:order by|limit)\s+|$)/i);
        if (groupMatch) {
            components.groupBy = groupMatch[1].trim();
        }

        // Extract ORDER BY clause
        const orderMatch = sql.match(/order by\s+(.*?)(?:\s+limit\s+|$)/i);
        if (orderMatch) {
            components.orderBy = orderMatch[1].trim();
        }

        // Extract LIMIT clause
        const limitMatch = sql.match(/limit\s+(\d+)/i);
        if (limitMatch) {
            components.limit = limitMatch[1].trim();
        }

        return components;
    }

    private evaluateColumn(row: any, columnExpr: string): any {
        // Handle COUNT(*)
        if (columnExpr.toLowerCase() === 'count(*)') {
            return 1; // Will be summed up later in aggregation
        }

        // Handle other aggregation functions
        const aggMatch = columnExpr.toLowerCase().match(/(count|sum|avg|min|max)\((.*?)\)/i);
        if (aggMatch) {
            const [, func, field] = aggMatch;
            const value = field === '*' ? 1 : row.row_data[field];
            return value;
        }

        // Handle regular columns
        return row.row_data[columnExpr];
    }

    private handleAggregation(data: any[], components: any): any[] {
        const columns = components.columns.split(',').map((col: string) => col.trim());
        const result: any = { row_data: {} };

        columns.forEach((col: string) => {
            const aggMatch = col.toLowerCase().match(/(count|sum|avg|min|max)\((.*?)\)/i);
            if (aggMatch) {
                const [fullMatch, func, field] = aggMatch;
                const alias = col.includes(' as ') ? col.split(' as ')[1].trim() : 'count';

                const values = data.map(row => this.evaluateColumn(row, col)).filter(val => val != null);
                
                switch (func.toLowerCase()) {
                    case 'count':
                        result.row_data[alias] = field === '*' ? data.length : values.length;
                        break;
                    case 'sum':
                        result.row_data[alias] = values.reduce((sum: number, val: number) => sum + val, 0);
                        break;
                    case 'avg':
                        result.row_data[alias] = values.length ? values.reduce((sum: number, val: number) => sum + val, 0) / values.length : null;
                        break;
                    case 'min':
                        result.row_data[alias] = values.length ? Math.min(...values) : null;
                        break;
                    case 'max':
                        result.row_data[alias] = values.length ? Math.max(...values) : null;
                        break;
                }
            }
        });

        console.log('Aggregation result:', result);
        return [result];
    }

    private groupData(data: any[], groupBy: string, columns: string): any[] {
        const groups = new Map();
        const groupCols = groupBy.split(',').map(col => col.trim());
        const selectCols = columns.split(',').map(col => col.trim());

        data.forEach(row => {
            // Create group key from groupBy columns
            const groupKey = groupCols.map(col => row.row_data[col]).join('|');

            if (!groups.has(groupKey)) {
                const groupRow: any = { row_data: {} };  // Change to match TableData structure
                // Add groupBy columns to result
                groupCols.forEach(col => {
                    groupRow.row_data[col] = row.row_data[col];
                });
                // Initialize aggregates
                selectCols.forEach(col => {
                    const aggMatch = col.toLowerCase().match(/(count|sum|avg|min|max)\((.*?)\)/);
                    if (aggMatch) {
                        const [fullMatch, func] = aggMatch;
                        const alias = col.includes(' as ') ? col.split(' as ')[1].trim() : fullMatch;
                        groupRow[alias] = [];
                    }
                });
                groups.set(groupKey, groupRow);
            }

            // Add values to aggregates
            const groupRow = groups.get(groupKey);
            selectCols.forEach(col => {
                const aggMatch = col.toLowerCase().match(/(count|sum|avg|min|max)\((.*?)\)/);
                if (aggMatch) {
                    const [fullMatch] = aggMatch;
                    const alias = col.includes(' as ') ? col.split(' as ')[1].trim() : fullMatch;
                    const value = this.evaluateColumn(row, col);
                    if (value != null) {
                        groupRow[alias].push(value);
                    }
                }
            });
        });

        // Calculate final aggregates for each group
        return Array.from(groups.values()).map(group => {
            const result = { row_data: { ...group.row_data } };  // Change to match TableData structure
            selectCols.forEach(col => {
                const aggMatch = col.toLowerCase().match(/(count|sum|avg|min|max)\((.*?)\)/);
                if (aggMatch) {
                    const [fullMatch, func] = aggMatch;
                    const alias = col.includes(' as ') ? col.split(' as ')[1].trim() : fullMatch;
                    const values = group[alias];
                    switch (func) {
                        case 'count':
                            result.row_data[alias] = values.length;
                            break;
                        case 'sum':
                            result.row_data[alias] = values.reduce((sum: number, val: number) => sum + val, 0);
                            break;
                        case 'avg':
                            result.row_data[alias] = values.length ? values.reduce((sum: number, val: number) => sum + val, 0) / values.length : null;
                            break;
                        case 'min':
                            result.row_data[alias] = values.length ? Math.min(...values) : null;
                            break;
                        case 'max':
                            result.row_data[alias] = values.length ? Math.max(...values) : null;
                            break;
                    }
                }
            });
            return result;
        });
    }

    private filterData(data: any[], whereClause: string): any[] {
        // Basic WHERE clause parsing
        // Example: "price > 1000 and category = 'electronics'"
        return data.filter(row => {
            try {
                // Convert the WHERE clause to a JavaScript condition
                const condition = whereClause
                    .replace(/=/g, '===')
                    .replace(/and/g, '&&')
                    .replace(/or/g, '||')
                    .replace(/(\w+)\s*([><=!]+)\s*(\d+)/g, (_, field, op, value) => {
                        return `row['${field}'] ${op} ${value}`;
                    })
                    .replace(/(\w+)\s*([><=!]+)\s*'([^']+)'/g, (_, field, op, value) => {
                        return `row['${field}'] ${op} '${value}'`;
                    });

                // Evaluate the condition
                return new Function('row', `return ${condition}`)(row);
            } catch (error) {
                console.error('Error in WHERE clause:', error);
                return true;
            }
        });
    }

    private sortData(data: any[], orderClause: string): any[] {
        // Basic ORDER BY parsing
        // Example: "price desc, name asc"
        const orders = orderClause.split(',').map(order => {
            const [field, direction] = order.trim().split(' ');
            return { field, direction: direction?.toLowerCase() === 'desc' ? 'desc' : 'asc' };
        });

        return [...data].sort((a, b) => {
            for (const order of orders) {
                const valueA = a[order.field];
                const valueB = b[order.field];

                if (valueA === valueB) continue;

                if (order.direction === 'desc') {
                    return valueA > valueB ? -1 : 1;
                } else {
                    return valueA < valueB ? -1 : 1;
                }
            }
            return 0;
        });
    }
} 