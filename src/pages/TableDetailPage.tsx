import { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import type { Table, Database } from '../services/DatabaseService';
import { DatabaseService } from '../services/DatabaseService';
import TableDataView from '../components/TableDataView';

interface DatabaseContextType {
    database: Database | null;
    refreshDatabase: (databaseId: string) => Promise<void>;
}

const TableDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { database, refreshDatabase } = useOutletContext<DatabaseContextType>();
    const [table, setTable] = useState<Table | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTableDetails = async () => {
        if (!id) return;

        try {
            setIsLoading(true);
            setError(null);
            const tableData = await DatabaseService.getTableById(parseInt(id));
            setTable(tableData);
            // Also refresh the database context to ensure it has the latest data
            if (tableData.database_id) {
                await refreshDatabase(tableData.database_id.toString());
            }
        } catch (err: any) {
            console.error('Error fetching table details:', err);
            setError(err.message || 'Failed to fetch table details');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTableDetails();
    }, [id]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 text-lg mb-4">{error}</p>
                    <button
                        onClick={fetchTableDetails}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!table || !database) {
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
                <button
                    onClick={() => navigate(`/database/${database.id}`)}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                    {database.name}
                </button>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 dark:text-white font-medium">
                    {table.name}
                </span>
            </div>

            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {table.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                    {table.description || 'No description provided'}
                </p>
            </div>

            {/* Table Data View */}
            <TableDataView
                table={table}
                onError={setError}
            />
        </main>
    );
};

export default TableDetailPage; 