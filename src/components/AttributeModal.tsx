import { useState, useEffect } from 'react';
import type { Table, Attribute } from '../services/DatabaseService';
import { DatabaseService } from '../services/DatabaseService';
import { DataType } from '../../server/src/types/dataTypes';

interface AttributeModalProps {
    isOpen: boolean;
    onClose: () => void;
    table: Table;
    onUpdate: () => void;
}

const AttributeModal = ({ isOpen, onClose, table, onUpdate }: AttributeModalProps) => {
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (table.attributes) {
            setAttributes(table.attributes);
        }
    }, [table.attributes]);

    const handleAddAttribute = () => {
        setAttributes([
            ...attributes,
            {
                id: Date.now(), // Temporary ID for new attribute
                name: '',
                data_type: DataType.VARCHAR,
                is_nullable: true,
                is_primary_key: false,
                is_foreign_key: false,
                table_id: table.id,
                created_at: new Date(),
                updated_at: new Date()
            }
        ]);
    };

    const handleRemoveAttribute = (index: number) => {
        setAttributes(attributes.filter((_, i) => i !== index));
    };

    const handleAttributeChange = (index: number, field: keyof Attribute, value: any) => {
        setAttributes(attributes.map((attr, i) => 
            i === index ? { ...attr, [field]: value } : attr
        ));
    };

    const handleSave = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Validate attributes
            const duplicateNames = attributes
                .map(attr => attr.name.toLowerCase())
                .filter((name, index, array) => array.indexOf(name) !== index);

            if (duplicateNames.length > 0) {
                throw new Error(`Duplicate column names found: ${duplicateNames.join(', ')}`);
            }

            await DatabaseService.updateTable(table.id, {
                name: table.name,
                description: table.description,
                attributes: attributes
            });

            onUpdate();
            onClose();
        } catch (err: any) {
            console.error('Error updating attributes:', err);
            setError(err.message || 'Failed to update attributes');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Table Attributes: {table.name}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {attributes.map((attribute, index) => (
                        <div key={attribute.id} className="flex gap-4 items-start">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={attribute.name}
                                    onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                                    placeholder="Column name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div className="flex-1">
                                <select
                                    value={attribute.data_type}
                                    onChange={(e) => handleAttributeChange(index, 'data_type', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    {Object.values(DataType).map(type => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={attribute.is_nullable}
                                        onChange={(e) => handleAttributeChange(index, 'is_nullable', e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Nullable</span>
                                </label>
                                <button
                                    onClick={() => handleRemoveAttribute(index)}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-between">
                    <button
                        onClick={handleAddAttribute}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Add Column
                    </button>
                    <div className="space-x-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttributeModal; 