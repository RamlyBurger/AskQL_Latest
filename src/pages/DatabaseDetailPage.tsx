import { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import type { Database, Table, TableFormData, AttributeFormData } from '../services/DatabaseService';
import { DatabaseService } from '../services/DatabaseService';
import SQLService from '../services/SQLService';
import ImportCSVModal from '../components/ImportCSVModal';
import AttributeModal from '../components/AttributeModal';
import CreateTableModal from '../components/CreateTableModal';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

interface DatabaseContextType {
    database: Database | null;
    refreshDatabase: (databaseId: string) => Promise<void>;
}

interface DatabaseAnalytics {
    overview: {
        totalTables: number;
        totalAttributes: number;
        totalRows: number;
        avgAttributesPerTable: string | number;
    };
    tableStats: Array<{
        id: number;
        name: string;
        rowCount: number;
        attributeCount: number;
        description: string;
    }>;
    dataTypeDistribution: Record<string, number>;
    tableDataDistribution: Array<{
        name: string;
        value: number;
        percentage: string | number;
    }>;
    attributeAnalysis: Record<string, {
        count: number;
        tables: string[];
        nullable: number;
        primaryKeys: number;
        foreignKeys: number;
    }>;
    dataGrowthTrend: Array<{
        date: string;
        count: number;
    }>;
    dataQuality: {
        nullValues: number;
        totalValues: number;
        completenessPercentage: string | number;
    };
}

const DatabaseDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { database, refreshDatabase } = useOutletContext<DatabaseContextType>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isImportCSVModalOpen, setIsImportCSVModalOpen] = useState(false);
    const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);
    const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [analytics, setAnalytics] = useState<DatabaseAnalytics | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // Initialize SQL.js when the component mounts
    useEffect(() => {
        const initSQLJS = async () => {
            try {
                await SQLService.getInstance().init();
            } catch (err: any) {
                console.error('Failed to initialize SQL.js:', err);
                setError('Failed to initialize SQL database. Please try refreshing the page.');
            }
        };
        
        initSQLJS();
    }, []);

    // Fetch analytics when database loads
    useEffect(() => {
        if (database?.id) {
            fetchAnalytics();
        }
    }, [database?.id]);

    const fetchAnalytics = async () => {
        if (!id) return;
        
        try {
            setAnalyticsLoading(true);
            const response = await fetch(`http://localhost:3000/api/tableData/analytics/${id}`);
            const data = await response.json();
            
            if (data.success) {
                setAnalytics(data.data);
            } else {
                console.error('Failed to fetch analytics:', data.message);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const handleDeleteTable = async (tableId: number) => {
        if (!window.confirm('Are you sure you want to delete this table?')) return;

        try {
            setIsLoading(true);
            setError(null);
            await DatabaseService.deleteTable(tableId);
            if (id) {
                await refreshDatabase(id);
                await fetchAnalytics(); // Refresh analytics after deleting table
            }
        } catch (err: any) {
            console.error('Error deleting table:', err);
            setError(err.message || 'Failed to delete table');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportCSV = async (formData: { name: string; description: string; file: File }) => {
        if (!id) return;
        
        try {
            setIsLoading(true);
            setError(null);
            await DatabaseService.importCSV(parseInt(id), formData.name, formData.description, formData.file);
            await refreshDatabase(id);
            await fetchAnalytics(); // Refresh analytics after importing CSV
            setIsImportCSVModalOpen(false);
        } catch (err: any) {
            console.error('Error importing CSV:', err);
            setError(err.message || 'Failed to import CSV file');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTable = async (formData: { name: string; description: string; attributes: AttributeFormData[] }) => {
        if (!id) return;
        
        try {
            setIsLoading(true);
            setError(null);
            const tableData: TableFormData = {
                name: formData.name,
                description: formData.description,
                attributes: formData.attributes
            };
            await DatabaseService.createTable(parseInt(id), tableData);
            await refreshDatabase(id);
            await fetchAnalytics(); // Refresh analytics after creating table
            setIsCreateTableModalOpen(false);
        } catch (err: any) {
            console.error('Error creating table:', err);
            throw new Error(err.message || 'Failed to create table');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewAttributes = (table: Table) => {
        setSelectedTable(table);
        setIsAttributeModalOpen(true);
    };

    const handleAttributeUpdate = async () => {
        if (id) {
            await refreshDatabase(id);
            await fetchAnalytics(); // Refresh analytics after attribute update
        }
    };

    if (isLoading && !database) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (error && !database) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 text-lg mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/database')}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!database) {
        return null;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            {/* Navigation Breadcrumbs */}
            <div className="flex items-center space-x-2 mb-8 text-sm">
                <button
                    onClick={() => navigate('/database')}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                    Databases
                </button>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 dark:text-white font-medium">
                    {database?.name}
                </span>
            </div>

            {/* Database Info Section */}
            <div className="rounded-lg shadow-lg p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {database?.name}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300">
                            {database?.description || 'No description provided'}
                        </p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 py-1 px-3 rounded-full">
                            {database?.database_type}
                        </span>
                        <button
                            onClick={() => setIsCreateTableModalOpen(true)}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Create Table
                        </button>
                        <button
                            onClick={() => setIsImportCSVModalOpen(true)}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Import CSV
                        </button>
                    </div>
                </div>

                {/* Analytics Dashboard */}
                {analytics && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Database Analytics</h2>
                        
                        {/* Overview Statistics */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Total Tables</h3>
                                <p className="text-3xl font-bold">{analytics.overview.totalTables}</p>
                            </div>
                            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Total Attributes</h3>
                                <p className="text-3xl font-bold">{analytics.overview.totalAttributes}</p>
                            </div>
                            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Total Rows</h3>
                                <p className="text-3xl font-bold">{analytics.overview.totalRows.toLocaleString()}</p>
                            </div>
                            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Avg Attributes/Table</h3>
                                <p className="text-3xl font-bold">{analytics.overview.avgAttributesPerTable}</p>
                            </div>
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 mt-8">
                            
                            {/* Table Data Distribution Pie Chart */}
                            {analytics.tableDataDistribution.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Table Data Distribution</h3>
                                    <div className="h-80">
                                        <Pie
                                            data={{
                                                labels: analytics.tableDataDistribution.map(item => item.name),
                                                datasets: [{
                                                    data: analytics.tableDataDistribution.map(item => item.value),
                                                    backgroundColor: [
                                                        '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
                                                        '#EF4444', '#06B6D4', '#84CC16', '#F97316',
                                                        '#EC4899', '#6366F1'
                                                    ],
                                                    borderWidth: 2,
                                                    borderColor: '#fff'
                                                }]
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: {
                                                        position: 'bottom',
                                                        labels: {
                                                            color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
                                                        }
                                                    },
                                                    tooltip: {
                                                        callbacks: {
                                                            label: (context) => {
                                                                const item = analytics.tableDataDistribution[context.dataIndex];
                                                                return `${context.label}: ${context.formattedValue} rows (${item.percentage}%)`;
                                                            }
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Data Type Distribution Bar Chart */}
                            {Object.keys(analytics.dataTypeDistribution).length > 0 && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Data Type Distribution</h3>
                                    <div className="h-80">
                                        <Bar
                                            data={{
                                                labels: Object.keys(analytics.dataTypeDistribution),
                                                datasets: [{
                                                    label: 'Count',
                                                    data: Object.values(analytics.dataTypeDistribution),
                                                    backgroundColor: '#8B5CF6',
                                                    borderColor: '#7C3AED',
                                                    borderWidth: 1
                                                }]
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: {
                                                        display: false
                                                    }
                                                },
                                                scales: {
                                                    y: {
                                                        beginAtZero: true,
                                                        ticks: {
                                                            color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
                                                        },
                                                        grid: {
                                                            color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
                                                        }
                                                    },
                                                    x: {
                                                        ticks: {
                                                            color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
                                                        },
                                                        grid: {
                                                            color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Data Quality Doughnut Chart */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Data Quality</h3>
                                <div className="h-80">
                                    <Doughnut
                                        data={{
                                            labels: ['Complete Data', 'Missing/Null Data'],
                                            datasets: [{
                                                data: [
                                                    analytics.dataQuality.totalValues - analytics.dataQuality.nullValues,
                                                    analytics.dataQuality.nullValues
                                                ],
                                                backgroundColor: ['#10B981', '#EF4444'],
                                                borderWidth: 2,
                                                borderColor: '#fff'
                                            }]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    position: 'bottom',
                                                    labels: {
                                                        color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
                                                    }
                                                },
                                                tooltip: {
                                                    callbacks: {
                                                        label: (context) => {
                                                            const percentage = context.dataIndex === 0 
                                                                ? analytics.dataQuality.completenessPercentage 
                                                                : (100 - Number(analytics.dataQuality.completenessPercentage)).toFixed(1);
                                                            return `${context.label}: ${context.formattedValue} values (${percentage}%)`;
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                                <div className="text-center mt-4">
                                    <p className="text-2xl font-bold text-green-600">
                                        {analytics.dataQuality.completenessPercentage}%
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400">Data Completeness</p>
                                </div>
                            </div>

                            {/* Data Growth Trend Line Chart */}
                            {analytics.dataGrowthTrend.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Data Growth Trend</h3>
                                    <div className="h-80">
                                        <Line
                                            data={{
                                                labels: analytics.dataGrowthTrend.map(item => {
                                                    const date = new Date(item.date);
                                                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                }),
                                                datasets: [{
                                                    label: 'Records Added',
                                                    data: analytics.dataGrowthTrend.map(item => item.count),
                                                    borderColor: '#3B82F6',
                                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                    borderWidth: 2,
                                                    fill: true,
                                                    tension: 0.4
                                                }]
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: {
                                                        display: false
                                                    }
                                                },
                                                scales: {
                                                    y: {
                                                        beginAtZero: true,
                                                        ticks: {
                                                            color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
                                                        },
                                                        grid: {
                                                            color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
                                                        }
                                                    },
                                                    x: {
                                                        ticks: {
                                                            color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
                                                        },
                                                        grid: {
                                                            color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Table Statistics */}
                        {analytics.tableStats.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-12 mt-12">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Table Statistics</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Table Name
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Row Count
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Attributes
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Description
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {analytics.tableStats.map((table) => (
                                                <tr key={table.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                        {table.name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                        {table.rowCount.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                        {table.attributeCount}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                        {table.description || 'No description'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Attribute Analysis */}
                        {Object.keys(analytics.attributeAnalysis).length > 0 && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-12 mt-12">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Attribute Analysis by Data Type</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Object.entries(analytics.attributeAnalysis).map(([dataType, analysis]) => (
                                        <div key={dataType} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                            <h4 className="font-semibold text-gray-900 dark:text-white capitalize mb-2">
                                                {dataType}
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                                <p className="text-gray-600 dark:text-gray-300">
                                                    <span className="font-medium">Count:</span> {analysis.count}
                                                </p>
                                                <p className="text-gray-600 dark:text-gray-300">
                                                    <span className="font-medium">Tables:</span> {analysis.tables.length}
                                                </p>
                                                <p className="text-gray-600 dark:text-gray-300">
                                                    <span className="font-medium">Nullable:</span> {analysis.nullable}
                                                </p>
                                                <p className="text-gray-600 dark:text-gray-300">
                                                    <span className="font-medium">Primary Keys:</span> {analysis.primaryKeys}
                                                </p>
                                                <p className="text-gray-600 dark:text-gray-300">
                                                    <span className="font-medium">Foreign Keys:</span> {analysis.foreignKeys}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {analyticsLoading && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-3"></div>
                            <span className="text-gray-600 dark:text-gray-300">Loading analytics...</span>
                        </div>
                    </div>
                )}

                {/* Tables Section */}
                <div className="space-y-6 mt-16">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Tables</h2>
                    {database?.tables && database.tables.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {database.tables.map((table) => (
                                <div
                                    key={table.id}
                                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 shadow-md"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                                {table.name}
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                                                {table.description || 'No description'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteTable(table.id)}
                                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>

                                    {/* Table Actions */}
                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 flex space-x-4">
                                        <button
                                            onClick={() => handleViewAttributes(table)}
                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                                        >
                                            View Attributes
                                        </button>
                                        <button
                                            onClick={() => navigate(`/table/${table.id}`)}
                                            className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 text-sm"
                                        >
                                            View Data
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-600 dark:text-gray-400">
                            No tables found. Import a CSV file to create a new table.
                        </p>
                    )}
                </div>
            </div>

            {/* Import CSV Modal */}
            <ImportCSVModal
                isOpen={isImportCSVModalOpen}
                onClose={() => setIsImportCSVModalOpen(false)}
                onImport={handleImportCSV}
                isLoading={isLoading}
            />

            {/* Create Table Modal */}
            <CreateTableModal
                isOpen={isCreateTableModalOpen}
                onClose={() => setIsCreateTableModalOpen(false)}
                onCreate={handleCreateTable}
                isLoading={isLoading}
            />

            {/* Attribute Modal */}
            {selectedTable && (
                <AttributeModal
                    isOpen={isAttributeModalOpen}
                    onClose={() => {
                        setIsAttributeModalOpen(false);
                        setSelectedTable(null);
                    }}
                    table={selectedTable}
                    onUpdate={handleAttributeUpdate}
                />
            )}
        </main>
    );
};

export default DatabaseDetailPage; 