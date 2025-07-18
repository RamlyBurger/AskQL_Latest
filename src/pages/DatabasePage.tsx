// Dashboard Page
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Database {
    id: number;
    name: string;
    description: string;
    database_type: string;
    tables: { id: number }[];
    created_at: string;
    updated_at: string;
    size?: string;
    status?: 'healthy' | 'warning' | 'critical';
    performance?: number;
    queries_per_second?: number;
    active_connections?: number;
}

interface DatabaseFormData {
    name: string;
    description: string;
    database_type: string;
}

interface DatabaseStats {
    total_databases: number;
    total_tables: number;
    total_size: string;
    active_connections: number;
    queries_today: number;
    avg_response_time: string;
}

interface ActivityLog {
    id: number;
    action: string;
    database: string;
    user: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error';
}

const API_URL = 'http://localhost:3000/api';

const DatabasePage = () => {
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [databases, setDatabases] = useState<Database[]>([]);
    const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<DatabaseStats>({
        total_databases: 0,
        total_tables: 0,
        total_size: '0 GB',
        active_connections: 0,
        queries_today: 0,
        avg_response_time: '0ms'
    });
    const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([
        {
            id: 1,
            action: 'Database created',
            database: 'Sales_DB',
            user: 'John Doe',
            timestamp: new Date().toISOString(),
            status: 'success'
        },
        {
            id: 2,
            action: 'Backup completed',
            database: 'Analytics_DB',
            user: 'System',
            timestamp: new Date().toISOString(),
            status: 'success'
        },
        {
            id: 3,
            action: 'High CPU usage detected',
            database: 'Users_DB',
            user: 'System',
            timestamp: new Date().toISOString(),
            status: 'warning'
        }
    ]);
    const [formData, setFormData] = useState<DatabaseFormData>({
        name: '',
        description: '',
        database_type: 'postgresql'
    });

    useEffect(() => {
        // Initialize AOS
        const AOS = (window as any).AOS;
        AOS?.init({
            duration: 800,
            once: true
        });

        // Fetch databases and update stats
        fetchDatabases();
        updateStats();
    }, []);

    const fetchDatabases = async () => {
        try {
            const response = await fetch(`${API_URL}/databases`);
            const data = await response.json();
            if (data.success) {
                // Add mock data for demonstration
                const enhancedData = data.data.map((db: Database) => ({
                    ...db,
                    size: Math.floor(Math.random() * 100) + ' GB',
                    status: Math.random() > 0.8 ? 'warning' : 'healthy',
                    performance: Math.floor(Math.random() * 100),
                    queries_per_second: Math.floor(Math.random() * 1000),
                    active_connections: Math.floor(Math.random() * 100)
                }));
                setDatabases(enhancedData);
            }
        } catch (error) {
            console.error('Error fetching databases:', error);
            setError('Failed to fetch databases');
        }
    };

    const updateStats = () => {
        // Mock stats update
        setStats({
            total_databases: databases.length,
            total_tables: databases.reduce((acc, db) => acc + (db.tables?.length || 0), 0),
            total_size: databases.reduce((acc, db) => acc + parseInt(db.size || '0'), 0) + ' GB',
            active_connections: Math.floor(Math.random() * 1000),
            queries_today: Math.floor(Math.random() * 100000),
            avg_response_time: (Math.random() * 100).toFixed(2) + 'ms'
        });
    };

    const handleCreateDatabase = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null); // Clear any previous errors
        
        try {
            // Basic validation
            if (!formData.name.trim()) {
                throw new Error('Database name is required');
            }

            const response = await fetch(`${API_URL}/databases`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            
            if (data.success) {
                // Refresh the database list
                await fetchDatabases();
                setIsCreateModalOpen(false);
                // Reset form data
                setFormData({
                    name: '',
                    description: '',
                    database_type: 'postgresql'
                });
            } else {
                throw new Error(data.message || 'Failed to create database');
            }
        } catch (error: any) {
            console.error('Error creating database:', error);
            setError(error.message || 'Failed to create database. The database name must be unique.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditDatabase = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const response = await fetch(`${API_URL}/databases/${selectedDatabase?.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            
            if (data.success) {
                // Refresh the database list
                await fetchDatabases();
                setIsEditModalOpen(false);
                setSelectedDatabase(null);
            }
        } catch (error) {
            console.error('Error updating database:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteDatabase = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this database?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/databases/${id}`, {
                method: 'DELETE',
            });

            const data = await response.json();
            
            if (data.success) {
                // Refresh the database list
                await fetchDatabases();
            }
        } catch (error) {
            console.error('Error deleting database:', error);
        }
    };

    // Format the date to a relative time string
    const getRelativeTime = (date: string) => {
        const now = new Date();
        const updated = new Date(date);
        const diffInHours = Math.abs(now.getTime() - updated.getTime()) / 36e5;
        
        if (diffInHours < 1) return 'just now';
        if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
        return `${Math.floor(diffInHours / 24)} days ago`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'warning':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'critical':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    return (
        <main className="container mx-auto px-4 py-8">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Database Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300">
                        Monitor and manage your database infrastructure
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all duration-300 flex items-center space-x-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create Database</span>
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Total Databases */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Databases</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_databases}</h3>
                        </div>
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {stats.total_tables} total tables
                        </p>
                    </div>
                </div>

                {/* Active Connections */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Active Connections</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active_connections}</h3>
                        </div>
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="flex items-center">
                            <span className="text-green-500 text-sm">↑ 12%</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">from last hour</span>
                        </div>
                    </div>
                </div>

                {/* Queries Today */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Queries Today</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.queries_today.toLocaleString()}</h3>
                        </div>
                        <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Avg. response time: {stats.avg_response_time}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Database List */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Database Instances</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                                        <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Name</th>
                                        <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Type</th>
                                        <th className="text-center py-3 px-4 text-gray-900 dark:text-white">Size</th>
                                        <th className="text-center py-3 px-4 text-gray-900 dark:text-white">Status</th>
                                        <th className="text-center py-3 px-4 text-gray-900 dark:text-white">Performance</th>
                                        <th className="text-right py-3 px-4 text-gray-900 dark:text-white">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {databases.map(database => (
                                        <tr
                                            key={database.id}
                                            className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => navigate(`/database/${database.id}`)}
                                                    className="flex items-center space-x-3 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    <span className="font-medium">{database.name}</span>
                                                </button>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{database.description || 'No description'}</p>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 py-1 px-2 rounded-full text-sm">
                                                    {database.database_type}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="text-gray-900 dark:text-gray-300">{database.size}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(database.status || 'healthy')}`}>
                                                    {database.status || 'healthy'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-center">
                                                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-600 dark:bg-blue-400 rounded-full h-2"
                                                            style={{ width: `${database.performance}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{database.performance}%</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteDatabase(database.id)}
                                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 ml-2 transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg h-full">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-6">
                                {recentActivity.map(activity => (
                                    <div key={activity.id} className="flex items-start space-x-4">
                                        <div className={`p-2 rounded-lg ${
                                            activity.status === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                                            activity.status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                                            'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                        }`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                {activity.status === 'success' ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                ) : activity.status === 'warning' ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                )}
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.action}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {activity.database} by {activity.user}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                {new Date(activity.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {(isCreateModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-2xl w-full mx-4">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {isEditModalOpen ? 'Edit Database' : 'Create New Database'}
                        </h3>
                        
                        {/* Error Display */}
                        {error && (
                            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                                {error}
                            </div>
                        )}

                        <form onSubmit={isEditModalOpen ? handleEditDatabase : handleCreateDatabase}>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Database Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => {
                                            setFormData({...formData, name: e.target.value});
                                            setError(null); // Clear error when user types
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Enter database name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Enter database description"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Database Type
                                    </label>
                                    <select
                                        required
                                        value={formData.database_type}
                                        onChange={(e) => setFormData({...formData, database_type: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="postgresql">PostgreSQL</option>
                                        <option value="mysql">MySQL</option>
                                        <option value="mssql">Microsoft SQL Server</option>
                                        <option value="oracle">Oracle</option>
                                    </select>
                                </div>
                                <div className="flex justify-end space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreateModalOpen(false);
                                            setIsEditModalOpen(false);
                                            setSelectedDatabase(null);
                                            setError(null); // Clear error when closing modal
                                        }}
                                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    >
                                        {isLoading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                {isEditModalOpen ? 'Updating...' : 'Creating...'}
                                            </>
                                        ) : isEditModalOpen ? 'Update Database' : 'Create Database'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
};

export default DatabasePage; 