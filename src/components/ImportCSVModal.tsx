import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImportCSVModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (formData: { name: string; description: string; file: File }) => Promise<void>;
    isLoading: boolean;
}

interface ImportCSVFormData {
    name: string;
    description: string;
    file: File | null;
}

const ImportCSVModal = ({ isOpen, onClose, onImport, isLoading }: ImportCSVModalProps) => {
    const [formData, setFormData] = useState<ImportCSVFormData>({
        name: '',
        description: '',
        file: null
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFormData(prev => ({ ...prev, file: acceptedFiles[0] }));
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv']
        },
        maxFiles: 1
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.file) return;
        await onImport({
            name: formData.name,
            description: formData.description,
            file: formData.file
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-2xl w-full mx-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Import CSV as Table
                </h3>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-6">
                        {/* Table Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Table Name
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Enter table name"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Enter table description"
                                rows={3}
                            />
                        </div>

                        {/* File Drop Zone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                CSV File
                            </label>
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                                    ${isDragActive 
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                                        : 'border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-400'
                                    }
                                `}
                            >
                                <input {...getInputProps()} />
                                <div className="space-y-2">
                                    <i className="fas fa-file-csv text-4xl text-gray-400 dark:text-gray-500"></i>
                                    {formData.file ? (
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            Selected: {formData.file.name}
                                        </p>
                                    ) : (
                                        <>
                                            <p className="text-gray-600 dark:text-gray-300">
                                                Drag & drop your CSV file here
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                or click to select a file
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !formData.file}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Importing...
                                    </>
                                ) : 'Import CSV'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ImportCSVModal; 