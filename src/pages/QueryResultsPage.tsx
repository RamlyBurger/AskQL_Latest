import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
} from '@tanstack/react-table';
import SQLService from '../services/SQLService';
import { DatabaseService } from '../services/DatabaseService';
import type { SQLResult } from '../services/SQLService';
import { parseValueByType, formatDisplayValue } from '../utils/dataTypeUtils';

const QueryResultsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [results, setResults] = useState<SQLResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10
    });

    const sql = searchParams.get('sql');
    const dbId = searchParams.get('dbId');

    // Add function to handle DELETE operations (sql.js only, no database changes)
    const handleDeleteOperation = async (sql: string, dbId: string) => {
        try {
            // Parse the table name from the DELETE query
            const match = sql.match(/DELETE\s+FROM\s+(\w+)/i);
            if (!match) {
                throw new Error('Invalid DELETE query format');
            }

            const tableName = match[1];
            console.log('Executing DELETE in sql.js for table:', tableName);

            // Get the database structure with tables and their attributes
            const database = await DatabaseService.getDatabaseById(parseInt(dbId));
            
            // For each table, fetch its data and ensure we have attributes
            const tablesWithData = await Promise.all(
                (database.tables || []).map(async (table) => {
                    // First get the complete table info including attributes
                    const tableInfo = await DatabaseService.getTableById(table.id);
                    
                    // Then fetch all data for the table (no pagination)
                    const tableData = await DatabaseService.getTableData(table.id, 1, 1000000, undefined, undefined, 1000000);
                    
                    // Create attributes array from the column types
                    const attributes = Object.entries(tableData.columnTypes).map(([name, data_type]) => ({
                        name,
                        data_type,
                        is_nullable: true,
                        is_primary_key: false,
                        is_foreign_key: false
                    }));
                    
                    // Transform the data to match SQL.js format
                    const transformedData = tableData.data.map(row => row.row_data);
                    
                    return {
                        ...tableInfo,
                        data: transformedData,
                        attributes
                    };
                })
            );

            // Initialize SQL.js and create the database with the table data
            const sqlService = SQLService.getInstance();
            await sqlService.createDatabase(parseInt(dbId), tablesWithData);

            // First get the count of rows that will be deleted
            const whereClause = sql.match(/WHERE\s+(.+)/i)?.[1] || '';
            const countSql = whereClause 
                ? `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`
                : `SELECT COUNT(*) as count FROM ${tableName}`;
            
            console.log('Executing COUNT query:', countSql);
            const countResult = await sqlService.executeQuery(parseInt(dbId), countSql);
            const deletedCount = countResult.rows[0]?.count || 0;

            // Execute the DELETE query in SQL.js
            console.log('Executing DELETE query:', sql);
            await sqlService.executeQuery(parseInt(dbId), sql);

            // Get the remaining data after deletion to show the results
            const selectAfterDelete = `SELECT * FROM ${tableName}`;
            const remainingData = await sqlService.executeQuery(parseInt(dbId), selectAfterDelete);
            
            console.log(`DELETE operation completed. ${deletedCount} rows deleted, ${remainingData.rows.length} rows remaining.`);

            // Find the table's column types for proper display
            const table = tablesWithData.find(t => t.name.toLowerCase() === tableName.toLowerCase());
            const columnTypes = table?.attributes?.reduce((acc, attr) => {
                acc[attr.name] = attr.data_type;
                return acc;
            }, {} as Record<string, string>) || {};

            return {
                success: true,
                message: `DELETE operation executed: ${deletedCount} rows deleted`,
                result: {
                    ...remainingData,
                    columnTypes
                },
                affectedRows: deletedCount
            };
        } catch (error: any) {
            console.error('Error executing DELETE operation:', error);
            throw new Error(`Failed to execute DELETE: ${error.message}`);
        }
    };

    // Update the handleUpdateOperation function (sql.js only, no database changes)
    const handleUpdateOperation = async (sql: string, dbId: string) => {
        try {
            // Parse the table name from the UPDATE query
            const match = sql.match(/UPDATE\s+(\w+)\s+SET/i);
            if (!match) {
                throw new Error('Invalid UPDATE query format');
            }

            const tableName = match[1];
            console.log('Executing UPDATE in sql.js for table:', tableName);

            // Get the database structure with tables and their attributes
            const database = await DatabaseService.getDatabaseById(parseInt(dbId));
            
            // For each table, fetch its data and ensure we have attributes
            const tablesWithData = await Promise.all(
                (database.tables || []).map(async (table) => {
                    // First get the complete table info including attributes
                    const tableInfo = await DatabaseService.getTableById(table.id);
                    
                    // Then fetch all data for the table (no pagination)
                    const tableData = await DatabaseService.getTableData(table.id, 1, 1000000, undefined, undefined, 1000000);
                    
                    // Create attributes array from the column types
                    const attributes = Object.entries(tableData.columnTypes).map(([name, data_type]) => ({
                        name,
                        data_type,
                        is_nullable: true,
                        is_primary_key: false,
                        is_foreign_key: false
                    }));
                    
                    // Transform the data to match SQL.js format
                    const transformedData = tableData.data.map(row => row.row_data);
                    
                    return {
                        ...tableInfo,
                        data: transformedData,
                        attributes
                    };
                })
            );

            // Initialize SQL.js and create the database with the table data
            const sqlService = SQLService.getInstance();
            await sqlService.createDatabase(parseInt(dbId), tablesWithData);

            // First get the count of rows that will be updated
            const whereClause = sql.match(/WHERE\s+(.+)/i)?.[1] || '';
            const countSql = whereClause 
                ? `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`
                : `SELECT COUNT(*) as count FROM ${tableName}`;
            
            console.log('Executing COUNT query:', countSql);
            const countResult = await sqlService.executeQuery(parseInt(dbId), countSql);
            const updatedCount = countResult.rows[0]?.count || 0;

            // Execute the UPDATE query in SQL.js
            console.log('Executing UPDATE query:', sql);
            await sqlService.executeQuery(parseInt(dbId), sql);

            // Get the updated data after update to show the results
            const selectAfterUpdate = `SELECT * FROM ${tableName}`;
            const updatedData = await sqlService.executeQuery(parseInt(dbId), selectAfterUpdate);
            
            console.log(`UPDATE operation completed. ${updatedCount} rows updated, ${updatedData.rows.length} rows total.`);

            // Find the table's column types for proper display
            const table = tablesWithData.find(t => t.name.toLowerCase() === tableName.toLowerCase());
            const columnTypes = table?.attributes?.reduce((acc, attr) => {
                acc[attr.name] = attr.data_type;
                return acc;
            }, {} as Record<string, string>) || {};

            return {
                success: true,
                message: `UPDATE operation executed: ${updatedCount} rows updated`,
                result: {
                    ...updatedData,
                    columnTypes
                },
                affectedRows: updatedCount
            };
        } catch (error: any) {
            console.error('Error executing UPDATE operation:', error);
            throw new Error(`Failed to execute UPDATE: ${error.message}`);
        }
    };

    useEffect(() => {
        const loadDatabaseAndExecuteQuery = async () => {
            if (!sql || !dbId) {
                setError('Missing SQL query or database ID');
                setLoading(false);
                return;
            }

            try {
                // Check if it's a DELETE operation
                if (sql.trim().toUpperCase().startsWith('DELETE')) {
                    const result = await handleDeleteOperation(sql, dbId);
                    // Display the remaining data after deletion instead of just a message
                    if (result.result) {
                        setResults(result.result);
                    } else {
                        setResults({
                            columns: ['message'],
                            rows: [{ message: result.message }],
                            columnTypes: { message: 'VARCHAR' }
                        });
                    }
                    return;
                }

                // Check if it's an UPDATE operation
                if (sql.trim().toUpperCase().startsWith('UPDATE')) {
                    const result = await handleUpdateOperation(sql, dbId);
                    // Display the updated data instead of just a message
                    if (result.result) {
                        setResults(result.result);
                    } else {
                        setResults({
                            columns: ['message'],
                            rows: [{ message: result.message }],
                            columnTypes: { message: 'VARCHAR' }
                        });
                    }
                    return;
                }

                // First, get the database structure with tables and their attributes
                const database = await DatabaseService.getDatabaseById(parseInt(dbId));
                console.log('Database structure:', database);
                
                // For each table, fetch its data and ensure we have attributes
                const tablesWithData = await Promise.all(
                    (database.tables || []).map(async (table) => {
                        // First get the complete table info including attributes
                        const tableInfo = await DatabaseService.getTableById(table.id);
                        
                        // Then fetch all data for the table (no pagination)
                        const tableData = await DatabaseService.getTableData(table.id, 1, 1000000, undefined, undefined, 1000000);
                        console.log(`Table ${table.name} data:`, tableData);
                        console.log('Table structure:', tableInfo);
                        
                        // Create attributes array from the column types
                        const attributes = Object.entries(tableData.columnTypes).map(([name, data_type]) => ({
                            name,
                            data_type,
                            is_nullable: true,
                            is_primary_key: false,
                            is_foreign_key: false
                        }));
                        
                        // Transform the data to match SQL.js format
                        const transformedData = tableData.data.map(row => row.row_data);

                        console.log(`Transformed data for table ${table.name}:`, {
                            sampleData: transformedData.slice(0, 2),
                            totalRows: transformedData.length,
                            attributes
                        });
                        
                        return {
                            ...tableInfo,
                            data: transformedData,
                            attributes
                        };
                    })
                );

                console.log('All tables with data:', tablesWithData.map(t => ({
                    name: t.name,
                    rowCount: t.data.length,
                    attributes: t.attributes.map(a => `${a.name} (${a.data_type})`)
                })));

                // Initialize SQL.js and create the database with the table data
                const sqlService = SQLService.getInstance();
                await sqlService.createDatabase(parseInt(dbId), tablesWithData);

                // Now execute the query
                console.log('Executing SQL query:', sql);
                const result = await sqlService.executeQuery(parseInt(dbId), sql);
                console.log('Query result:', result);
                
                // Get the table name from the SQL query
                const tableMatch = sql.match(/from\s+(\w+)/i);
                const tableName = tableMatch ? tableMatch[1] : null;
                
                // Find the table's column types
                const table = tablesWithData.find(t => t.name.toLowerCase() === tableName?.toLowerCase());
                const columnTypes = table?.attributes?.reduce((acc, attr) => {
                    acc[attr.name] = attr.data_type;
                    return acc;
                }, {} as Record<string, string>) || {};
                
                setResults({
                    ...result,
                    columnTypes
                });
            } catch (error: any) {
                console.error('Error executing query:', error);
                setError(error.message || 'Failed to execute query');
            } finally {
                setLoading(false);
            }
        };

        loadDatabaseAndExecuteQuery();
    }, [sql, dbId]);

    const columns = useMemo(() => {
        if (!results?.columns) return [];

        // Add Row Number column first
        const cols: ColumnDef<any, unknown>[] = [
            {
                id: 'rowNumber',
                header: '#',
                accessorFn: (_row: any, index: number) => index + 1,
                cell: (info) => info.getValue(),
                enableSorting: true,
            }
        ];

        // Add data columns
        const dataCols = results.columns.map(column => ({
            accessorFn: (row: any) => {
                const value = row[column];
                const dataType = results.columnTypes?.[column] || 'varchar';
                return parseValueByType(value, dataType, true);
            },
            id: column,
            header: () => (
                <div className="cursor-pointer">
                    {column}
                </div>
            ),
            cell: (info: any) => {
                const value = info.getValue();
                const dataType = results.columnTypes?.[info.column.id] || 'varchar';
                const displayValue = formatDisplayValue(value, dataType);
                return (
                    <div className="truncate">
                        {displayValue}
                    </div>
                );
            },
            enableSorting: true,
            sortingFn: (rowA: any, rowB: any, columnId: string) => {
                const a = rowA.getValue(columnId);
                const b = rowB.getValue(columnId);

                if (a === null && b === null) return 0;
                if (a === null) return 1;
                if (b === null) return -1;

                if (a < b) return -1;
                if (a > b) return 1;
                return 0;
            }
        }));

        cols.push(...dataCols);
        return cols;
    }, [results?.columns, results?.columnTypes]);

    const data = useMemo(() => {
        if (!results?.rows) return [];
        return results.rows.map(row => {
            if (row.row_data) {
                return row.row_data;
            }
            return row;
        });
    }, [results?.rows]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            sorting,
            globalFilter,
            pagination,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
    });

    const handleBack = () => {
        navigate(-1);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Query Results</h2>
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                        Back
                    </button>
                </div>

                {error ? (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <input
                                type="text"
                                placeholder="Search all columns..."
                                value={globalFilter}
                                onChange={e => setGlobalFilter(e.target.value)}
                                className="block flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            {!error && results && (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th
                                                key={header.id}
                                                onClick={header.column.getToggleSortingHandler()}
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                            >
                                                <div className="flex items-center gap-1">
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {header.column.getIsSorted() && (
                                                        <span className="text-blue-600 dark:text-blue-400">
                                                            {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                                                        </span>
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {table.getRowModel().rows.map(row => (
                                    <tr
                                        key={row.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <td
                                                key={cell.id}
                                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300"
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex flex-wrap justify-between items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Page{' '}
                                    <strong>
                                        {pagination.pageIndex + 1} of{' '}
                                        {table.getPageCount()}
                                    </strong>
                                </span>
                                <select
                                    value={pagination.pageSize}
                                    onChange={e => {
                                        setPagination(prev => ({
                                            ...prev,
                                            pageSize: Number(e.target.value),
                                            pageIndex: 0
                                        }));
                                    }}
                                    className="px-2 py-1 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    {[10, 20, 30, 40, 50].map(pageSize => (
                                        <option key={pageSize} value={pageSize}>
                                            Show {pageSize}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, pageIndex: 0 }))}
                                    disabled={!table.getCanPreviousPage()}
                                    className="inline-flex items-center px-2 py-1 border border-gray-300 text-sm rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                                >
                                    {'<<'}
                                </button>
                                <button
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                                >
                                    Next
                                </button>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, pageIndex: table.getPageCount() - 1 }))}
                                    disabled={!table.getCanNextPage()}
                                    className="inline-flex items-center px-2 py-1 border border-gray-300 text-sm rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                                >
                                    {'>>'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default QueryResultsPage; 