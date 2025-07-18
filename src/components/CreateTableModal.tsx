import { useState } from 'react';
import type { AttributeFormData } from '../services/DatabaseService';

interface CreateTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (formData: { name: string; description: string; attributes: AttributeFormData[] }) => Promise<void>;
    isLoading: boolean;
}

const DATA_TYPES = [
    { value: 'INTEGER', label: 'Integer' },
    { value: 'NUMERIC', label: 'Numeric' },
    { value: 'TIMESTAMP', label: 'Timestamp' },
    { value: 'BOOLEAN', label: 'Boolean' },
    { value: 'VARCHAR', label: 'Text (Varchar)' }
];

const CreateTableModal = ({ isOpen, onClose, onCreate, isLoading }: CreateTableModalProps) => {
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [attributes, setAttributes] = useState<AttributeFormData[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleAddAttribute = () => {
        setAttributes([
            ...attributes,
            {
                name: '',
                data_type: 'VARCHAR',
                is_nullable: true,
                is_primary_key: false,
                is_foreign_key: false
            }
        ]);
    };

    const handleRemoveAttribute = (index: number) => {
        setAttributes(attributes.filter((_, i) => i !== index));
    };

    const handleAttributeChange = (index: number, field: keyof AttributeFormData, value: any) => {
        const newAttributes = [...attributes];
        newAttributes[index] = {
            ...newAttributes[index],
            [field]: value
        };
        setAttributes(newAttributes);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            // Basic validation
            if (!formData.name.trim()) {
                throw new Error('Table name is required');
            }

            if (attributes.length === 0) {
                throw new Error('At least one attribute is required');
            }

            // Check for duplicate attribute names
            const attributeNames = attributes.map(attr => attr.name.toLowerCase());
            const duplicates = attributeNames.filter((name, index) => attributeNames.indexOf(name) !== index);
            if (duplicates.length > 0) {
                throw new Error(`Duplicate attribute names found: ${duplicates.join(', ')}`);
            }

            // Check for empty attribute names
            const emptyAttributes = attributes.some(attr => !attr.name.trim());
            if (emptyAttributes) {
                throw new Error('All attributes must have names');
            }

            await onCreate({
                ...formData,
                attributes
            });
            
            // Reset form
            setFormData({
                name: '',
                description: ''
            });
            setAttributes([]);
        } catch (err: any) {
            setError(err.message || 'Failed to create table');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Create New Table
                </h3>

                {error && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Table Name
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => {
                                    setFormData({ ...formData, name: e.target.value });
                                    setError(null);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Enter table name"
                            />
                        </div>

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

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Attributes
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAddAttribute}
                                    className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                                >
                                    + Add Attribute
                                </button>
                            </div>
                            <div className="space-y-4">
                                {attributes.map((attribute, index) => (
                                    <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={attribute.name}
                                                onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                                                placeholder="Attribute name"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                            />
                                        </div>
                                        <div className="w-40">
                                            <select
                                                value={attribute.data_type}
                                                onChange={(e) => handleAttributeChange(index, 'data_type', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                            >
                                                {DATA_TYPES.map(type => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={attribute.is_nullable}
                                                    onChange={(e) => handleAttributeChange(index, 'is_nullable', e.target.checked)}
                                                    className="rounded border-gray-300"
                                                />
                                                <span className="text-sm">Nullable</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={attribute.is_primary_key}
                                                    onChange={(e) => handleAttributeChange(index, 'is_primary_key', e.target.checked)}
                                                    className="rounded border-gray-300"
                                                />
                                                <span className="text-sm">Primary Key</span>
                                            </label>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveAttribute(index)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                {attributes.length === 0 && (
                                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                        No attributes added yet. Click "Add Attribute" to start defining your table structure.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    setFormData({ name: '', description: '' });
                                    setAttributes([]);
                                    setError(null);
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
                                        Creating...
                                    </>
                                ) : (
                                    'Create Table'
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTableModal; 