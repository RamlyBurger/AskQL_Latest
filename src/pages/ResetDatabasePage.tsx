import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api';

const ResetDatabasePage = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const handleReset = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(`${API_URL}/databases/reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ confirm: true })
            });

            if (!response.ok) {
                throw new Error(`Failed to reset database: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/database');
                }, 2000);
            } else {
                throw new Error(data.message || 'Failed to reset database');
            }
        } catch (error: any) {
            console.error('Error resetting database:', error);
            setError(error.message || 'An error occurred while resetting the database');
        } finally {
            setIsLoading(false);
            setShowConfirmation(false);
        }
    };

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                        Reset Database
                    </h1>
                    
                    <div className="mb-8">
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Warning: This action will remove all existing tables and data from the database.
                            This action cannot be undone.
                        </p>
                        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 mb-6">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                        All tables, data, and relationships will be permanently deleted.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                            Database reset successfully! Redirecting...
                        </div>
                    )}

                    <div className="flex space-x-4">
                        <button
                            onClick={() => navigate('/database')}
                            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => setShowConfirmation(true)}
                            disabled={isLoading || success}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Reset Database
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            Confirm Reset
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Are you absolutely sure you want to reset the database? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReset}
                                disabled={isLoading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Resetting...
                                    </>
                                ) : (
                                    'Yes, Reset Database'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ResetDatabasePage; 