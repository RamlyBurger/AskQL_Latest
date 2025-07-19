import { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import type { Database, Table, TableFormData, Attribute, AttributeFormData } from '../services/DatabaseService';
import { DatabaseService } from '../services/DatabaseService';
import SQLService from '../services/SQLService';
import TableDataView from '../components/TableDataView';
import ImportCSVModal from '../components/ImportCSVModal';
import AttributeModal from '../components/AttributeModal';
import CreateTableModal from '../components/CreateTableModal';

interface DatabaseContextType {
    database: Database | null;
    refreshDatabase: (databaseId: string) => Promise<void>;
}

const GEMINI_API_KEY = import.meta.env.GEMINI_API_KEY;

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

    const handleDeleteTable = async (tableId: number) => {
        if (!window.confirm('Are you sure you want to delete this table?')) return;

        try {
            setIsLoading(true);
            setError(null);
            await DatabaseService.deleteTable(tableId);
            if (id) {
                await refreshDatabase(id);
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
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

                {/* Tables Section */}
                <div className="space-y-6">
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