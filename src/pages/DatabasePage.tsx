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
}

interface DatabaseFormData {
    name: string;
    description: string;
    database_type: string;
}

const API_URL = 'http://localhost:3000/api';

const DatabasePage = () => {
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [databases, setDatabases] = useState<Database[]>([]);
    const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
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

        // Fetch databases
        fetchDatabases();
    }, []);

    const fetchDatabases = async () => {
        try {
            const response = await fetch(`${API_URL}/databases`);
            const data = await response.json();
            if (data.success) {
                setDatabases(data.data);
            }
        } catch (error) {
            console.error('Error fetching databases:', error);
        }
    };

    const handleCreateDatabase = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
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
            }
        } catch (error) {
            console.error('Error creating database:', error);
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

    return (
        <main className="container mx-auto px-4 py-8">
            {/* Navigation Breadcrumbs */}
            <div className="flex items-center space-x-2 mb-8 text-sm">
                <span className="text-gray-900 dark:text-white font-medium">
                    Databases
                </span>
            </div>

            {/* Header Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            Database Management
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300">
                            Create, manage, and analyze your databases with powerful tools and intuitive interfaces.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Create Database
                    </button>
                </div>

                {/* Database List */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-3 px-4">Name</th>
                                <th className="text-left py-3 px-4">Description</th>
                                <th className="text-center py-3 px-4">Tables</th>
                                <th className="text-center py-3 px-4">Type</th>
                                <th className="text-center py-3 px-4">Last Updated</th>
                                <th className="text-right py-3 px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {databases.map(database => (
                                <tr
                                    key={database.id}
                                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => navigate(`/database/${database.id}`)}
                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                        >
                                            {database.name}
                                        </button>
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                        {database.description || 'No description'}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {database.tables?.length || 0}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 py-1 px-2 rounded-full text-sm">
                                            {database.database_type}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-300">
                                        {new Date(database.updated_at).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <button
                                            onClick={() => handleDeleteDatabase(database.id)}
                                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 ml-2"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Database Modal */}
            {(isCreateModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-2xl w-full mx-4">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {isEditModalOpen ? 'Edit Database' : 'Create New Database'}
                        </h3>
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
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
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