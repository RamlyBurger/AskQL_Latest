import { DataType } from '../../server/src/types/dataTypes';

export const getInputType = (dataType: string): string => {
    switch (dataType.toUpperCase()) {
        case DataType.TIMESTAMP:
            return 'datetime-local';
        case DataType.INTEGER:
        case DataType.NUMERIC:
            return 'number';
        case DataType.BOOLEAN:
            return 'checkbox';
        default:
            return 'text';
    }
};

export const isNumericType = (dataType: string): boolean => {
    const type = dataType.toUpperCase();
    return type === DataType.INTEGER || type === DataType.NUMERIC;
};

export const parseValueByType = (value: any, dataType: string, forSorting: boolean = false): any => {
    // For sorting, we want empty values to be treated differently
    if (forSorting && (value === null || value === undefined || value === '')) {
        return null; // This will make empty values appear at the end when sorting
    }

    // For display and non-sorting operations, treat empty numeric values as 0
    if (isNumericType(dataType) && (value === null || value === undefined || value === '')) {
        return 0;
    }

    // For non-numeric types, keep null for empty values
    if (value === null || value === undefined || value === '') {
        return null;
    }
    
    switch (dataType.toUpperCase()) {
        case DataType.INTEGER: {
            const parsed = parseInt(value);
            return isNaN(parsed) ? (forSorting ? null : 0) : parsed;
        }
        case DataType.NUMERIC: {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? (forSorting ? null : 0) : Number(parsed.toFixed(6));
        }
        case DataType.TIMESTAMP: {
            const parsed = new Date(value).getTime();
            return isNaN(parsed) ? null : parsed;
        }
        case DataType.BOOLEAN:
            return Boolean(value);
        default:
            return String(value);
    }
};

export const formatDisplayValue = (value: any, dataType: string): string => {
    if (value === null || value === undefined || value === '') {
        return isNumericType(dataType) ? '0' : '';
    }
    
    switch (dataType.toUpperCase()) {
        case DataType.TIMESTAMP:
            return new Date(value).toLocaleString();
        case DataType.INTEGER:
            return value.toString();
        case DataType.NUMERIC:
            // Format with up to 6 decimal places for floating point numbers
            return typeof value === 'number' ? value.toFixed(6) : '0.000000';
        case DataType.BOOLEAN:
            return value ? 'true' : 'false';
        default:
            return String(value);
    }
}; 