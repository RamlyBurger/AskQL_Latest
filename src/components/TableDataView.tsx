import { useEffect, useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    createColumnHelper,
    flexRender,
    type ColumnDef,
    type SortingState,
} from '@tanstack/react-table';
import type { Table, TableData, TableDataPagination } from '../services/DatabaseService';
import { DatabaseService } from '../services/DatabaseService';
import { parseValueByType, formatDisplayValue, getInputType } from '../utils/dataTypeUtils';

interface EditCellModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (value: any) => void;
    currentValue: any;
    attributeName: string;
    dataType: string;
}

const EditCellModal = ({ isOpen, onClose, onSave, currentValue, attributeName, dataType }: EditCellModalProps) => {
    const [value, setValue] = useState(currentValue);

    useEffect(() => {
        setValue(currentValue);
    }, [currentValue]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(value);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Edit {attributeName}
                </h3>
                <input
                    type={getInputType(dataType)}
                    value={value ?? ''}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    autoFocus
                />
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

interface TableDataViewProps {
    table: Table;
    onError: (error: string) => void;
}

interface EditingCell {
    rowId: number;
    attributeName: string;
    dataType: string;
    currentValue: any;
}

const TableDataView = ({ table, onError }: TableDataViewProps) => {
    const [tableData, setTableData] = useState<TableDataPagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [isAddingRow, setIsAddingRow] = useState(false);
    const [newRowData, setNewRowData] = useState<Record<string, any>>({});
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10
    });
    const [showTopN, setShowTopN] = useState(false);
    const [topNCount, setTopNCount] = useState(10);
    // Add new state for storing all data
    const [allData, setAllData] = useState<TableData[]>([]);

    const columnHelper = createColumnHelper<TableData>();

    // Update the columns definition to enable sorting and use proper data types
    const columns = useMemo(() => {
        if (!table.attributes) return [];

        // Add Row Number column first
        const cols: ColumnDef<TableData, unknown>[] = [
            {
                id: 'rowNumber',
                header: '#',
                accessorFn: (row: TableData) => {
                    // Use the record's id field directly
                    return row.id;
                },
                cell: (info) => {
                    const value = info.getValue();
                    return value;
                },
                enableSorting: true,
            }
        ];

        // Add data columns
        if (table.attributes) {
            const dataCols: ColumnDef<TableData, unknown>[] = table.attributes
                .filter(attr => attr.name.toLowerCase() !== 'id') // Exclude ID from data columns if it exists
                .map(attr => ({
                    accessorFn: (row: TableData) => {
                        const value = row.row_data[attr.name];
                        return parseValueByType(value, attr.data_type, true); // Use forSorting=true for sorting
                    },
                    id: attr.name,
                    header: () => (
                        <div className="cursor-pointer">
                            {attr.name}
                        </div>
                    ),
                    cell: (info) => {
                        const row = info.row.original;
                        const value = info.getValue();
                        const displayValue = formatDisplayValue(value, attr.data_type);
                        return (
                            <div className="flex items-center justify-between group">
                                <span className="truncate">{displayValue}</span>
                                <button
                                    onClick={() => handleEditCell(row.id, attr.name, attr.data_type, value)}
                                    className="invisible group-hover:visible text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ml-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                            </div>
                        );
                    },
                    enableSorting: true,
                    sortingFn: (rowA, rowB, columnId) => {
                        const attr = table.attributes?.find(a => a.name === columnId);
                        if (!attr) return 0;

                        const a = parseValueByType(rowA.original.row_data[columnId], attr.data_type, true);
                        const b = parseValueByType(rowB.original.row_data[columnId], attr.data_type, true);

                        if (a === null && b === null) return 0;
                        if (a === null) return 1; // Move nulls to the end
                        if (b === null) return -1;

                        if (a < b) return -1;
                        if (a > b) return 1;
                        return 0;
                    }
                }));

            cols.push(...dataCols);
        }

        // Add actions column
        cols.push({
            id: 'actions',
            header: 'Actions',
            cell: (info) => {
                const row = info.row.original;
                return (
                    <div className="flex justify-end space-x-2">
                        <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                            Delete
                        </button>
                    </div>
                );
            },
            enableSorting: false,
        });

        return cols;
    }, [table.attributes]);

    const data = useMemo(() => tableData?.data || [], [tableData?.data]);

    // Update the table instance to allow sorting for all columns
    const tableInstance = useReactTable({
        data: tableData?.data || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            globalFilter,
            pagination,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        pageCount: Math.ceil((tableData?.total || 0) / pagination.pageSize),
        manualPagination: true,
    });

    const fetchTableData = async () => {
        try {
            setIsLoading(true);
            
            // Get current sorting info
            const currentSort = sorting[0];
            const sortColumn = currentSort?.id;
            const sortOrder = currentSort?.desc ? 'desc' : 'asc';
            
            const data = await DatabaseService.getTableData(
                table.id,
                pagination.pageIndex + 1,
                pagination.pageSize,
                sortColumn,
                sortOrder,
                showTopN ? topNCount : undefined
            );
            
            setTableData(data);
            setAllData(data.data);
        } catch (err) {
            console.error('Error fetching table data:', err);
            onError('Failed to load table data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isLoading) {
            fetchTableData();
        }
    }, [table.id, refreshTrigger, pagination.pageIndex, pagination.pageSize, showTopN, topNCount, sorting]);

    // Modify the processedData logic to use the sorted data from backend
    const processedData = useMemo(() => {
        if (!tableData?.data) return [];
        
        let filteredData = [...tableData.data];

        if (globalFilter) {
            filteredData = filteredData.filter(row => {
                const searchString = globalFilter.toLowerCase();
                return Object.values(row.row_data).some(value => 
                    String(value).toLowerCase().includes(searchString)
                );
            });
        }

        return filteredData;
    }, [tableData?.data, globalFilter]);

    // Add effect to reset pagination when toggling showTopN
    useEffect(() => {
        setPagination(prev => ({
            ...prev,
            pageIndex: 0
        }));
    }, [showTopN]);

    const handleDeleteRow = async (rowId: number) => {
        if (!window.confirm('Are you sure you want to delete this row?')) {
            return;
        }

        try {
            setIsLoading(true);
            await DatabaseService.deleteTableRow(table.id, rowId);
            await fetchTableData(); // Fetch fresh data after delete
        } catch (err) {
            console.error('Error deleting row:', err);
            onError('Failed to delete row');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditCell = (rowId: number, attributeName: string, dataType: string, currentValue: any) => {
        setEditingCell({ rowId, attributeName, dataType, currentValue });
    };

    const handleSaveCellEdit = async (newValue: any) => {
        if (!editingCell) return;

        try {
            setIsLoading(true);
            const { rowId, attributeName } = editingCell;
            
            // Format the value based on the data type
            let formattedValue = formatValueByType(newValue, editingCell.dataType);

            // Get the current row data first
            const currentRow = tableData?.data.find(row => row.id === rowId);
            if (!currentRow) {
                throw new Error('Row not found');
            }

            // Create an update object with all existing data plus the changed field
            const updateData = {
                ...currentRow.row_data,
                [attributeName]: formattedValue
            };

            await DatabaseService.updateTableRow(table.id, rowId, updateData);
            await fetchTableData();
            setEditingCell(null);
        } catch (err) {
            console.error('Error updating cell:', err);
            onError('Failed to update cell');
        } finally {
            setIsLoading(false);
        }
    };

    const formatValueByType = (value: any, dataType: string): any => {
        switch (dataType.toLowerCase()) {
            case 'number':
            case 'integer':
            case 'int':
                return value === '' ? null : Number(value);
            case 'boolean':
                return value === 'true' || value === '1' || value === 'on';
            case 'date':
            case 'datetime':
            case 'timestamp':
                try {
                    return value ? new Date(value).toISOString() : null;
                } catch (e) {
                    return null;
                }
            default:
                return value || null;
        }
    };

    const handleAddNewRow = () => {
        setIsAddingRow(true);
        setNewRowData({});
    };

    const handleCancelNewRow = () => {
        setIsAddingRow(false);
        setNewRowData({});
    };

    const handleSaveNewRow = async () => {
        try {
            setIsLoading(true);
            await DatabaseService.insertTableData(table.id, newRowData);
            setIsAddingRow(false);
            setNewRowData({});
            await fetchTableData(); // Fetch fresh data after insert
        } catch (err) {
            console.error('Error inserting new row:', err);
            onError('Failed to insert new row');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (attributeName: string, value: string, dataType: string) => {
        let formattedValue: string | number | boolean | null = value;
        
        // Format the value based on data type
        switch (dataType.toLowerCase()) {
            case 'number':
            case 'integer':
            case 'int':
                formattedValue = value === '' ? null : Number(value);
                break;
            case 'boolean':
                formattedValue = value === 'true' || value === '1' || value === 'on';
                break;
            case 'date':
            case 'datetime':
            case 'timestamp':
                try {
                    formattedValue = value ? new Date(value).toISOString() : null;
                } catch (e) {
                    formattedValue = null;
                }
                break;
            default:
                formattedValue = value || null;
        }

        if (editingCell !== null) {
            // This function is no longer used for new rows, but kept for consistency
            // The new row data is handled by handleSaveNewRow
        } else {
            setNewRowData(prev => ({
                ...prev,
                [attributeName]: formattedValue
            }));
        }
    };

    // Add this function to handle sorting
    const handleSort = (column: string) => {
        setSorting(current => {
            if (!current || current.length === 0 || current[0].id !== column) {
                return [{ id: column, desc: false }];
            }
            if (current[0].desc) {
                return [];
            }
            return [{ id: column, desc: true }];
        });
    };

    const handleFilter = (column: string, value: string) => {
        // This function is now handled by @tanstack/react-table's globalFilter
        // and the column accessor's cell renderer.
        // setFilterConfigs(current => {
        //     const existing = current.find(f => f.column === column);
        //     if (existing) {
        //         return current.map(f => 
        //             f.column === column ? { ...f, value } : f
        //         );
        //     }
        //     return [...current, { column, value }];
        // });
    };

    const clearFilters = () => {
        setGlobalFilter('');
        // setFilterConfigs([]); // This state is no longer needed
        setSorting([]);
    };

    const handleAnalyze = async (query: string) => {
        try {
            // This is where you'll implement the AI analysis logic
            // For now, it's just a placeholder
            console.log('Analyzing:', query, 'for table:', table.name);
        } catch (error) {
            console.error('Error analyzing data:', error);
            onError('Failed to analyze data');
        }
    };

    if (!tableData || !tableData.data || !Array.isArray(tableData.data)) {
        return (
            <div className="min-h-[200px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                No data available
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Table Data</h2>
                    <button
                        onClick={() => setIsAddingRow(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                    >
                        + Add Row
                    </button>
                </div>

                {/* Search and Top N controls */}
                <div className="space-y-3">
                    <div className="flex items-center gap-4">
                        <input
                            type="text"
                            placeholder="Search all columns..."
                            value={globalFilter}
                            onChange={e => setGlobalFilter(e.target.value)}
                            className="block flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-700 dark:text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={showTopN}
                                    onChange={(e) => setShowTopN(e.target.checked)}
                                    className="mr-2"
                                />
                                Show Top
                            </label>
                            <select
                                value={topNCount}
                                onChange={(e) => setTopNCount(Number(e.target.value))}
                                disabled={!showTopN}
                                className="px-2 py-1 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                            >
                                {[5, 10, 15, 20, 25, 30, 40, 50].map(n => (
                                    <option key={n} value={n}>
                                        {n} rows
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        {tableInstance.getHeaderGroups().map(headerGroup => (
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
                        {/* New Row Form */}
                        {isAddingRow && table.attributes && (
                            <tr className="bg-blue-50 dark:bg-blue-900/20">
                            {table.attributes.map(attr => (
                                    <td key={attr.id} className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type={getInputType(attr.data_type)}
                                            value={newRowData[attr.name] || ''}
                                            onChange={(e) => handleInputChange(attr.name, e.target.value, attr.data_type)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                </td>
                            ))}
                                <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                    <button
                                        onClick={handleSaveNewRow}
                                        disabled={isLoading}
                                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                                    >
                                        {isLoading ? 'Saving...' : 'Save'}
                                    </button>
                                <button
                                        onClick={() => setIsAddingRow(false)}
                                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                                >
                                        Cancel
                                </button>
                            </td>
                        </tr>
                        )}

                        {/* Table Rows */}
                        {tableInstance.getRowModel().rows.map(row => (
                            <tr
                                key={row.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
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
                        {!showTopN ? (
                            <>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Page{' '}
                                    <strong>
                                        {pagination.pageIndex + 1} of{' '}
                                        {Math.ceil((tableData?.total || 0) / pagination.pageSize)}
                                    </strong>
                                    {' '} | Total rows: {tableData?.total || 0}
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
                            </>
                        ) : (
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Showing top {topNCount} rows from {allData.length} total rows
                            </span>
                        )}
                    </div>
                    {!showTopN && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, pageIndex: 0 }))}
                                disabled={pagination.pageIndex === 0}
                                className="inline-flex items-center px-2 py-1 border border-gray-300 text-sm rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                            >
                                {'<<'}
                            </button>
                        <button
                                onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
                                disabled={pagination.pageIndex === 0}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                                onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
                                disabled={!tableData || pagination.pageIndex >= Math.ceil(tableData.total / pagination.pageSize) - 1}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                        >
                            Next
                        </button>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.ceil((tableData?.total || 0) / prev.pageSize) - 1 }))}
                                disabled={!tableData || pagination.pageIndex >= Math.ceil(tableData.total / pagination.pageSize) - 1}
                                className="inline-flex items-center px-2 py-1 border border-gray-300 text-sm rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                            >
                                {'>>'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Add the EditCellModal */}
            {editingCell && (
                <EditCellModal
                    isOpen={true}
                    onClose={() => setEditingCell(null)}
                    onSave={handleSaveCellEdit}
                    currentValue={editingCell.currentValue}
                    attributeName={editingCell.attributeName}
                    dataType={editingCell.dataType}
                />
            )}
        </div>
    );
};

export default TableDataView; 