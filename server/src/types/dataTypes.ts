export enum DataType {
    INTEGER = 'INTEGER',     // Whole numbers
    NUMERIC = 'NUMERIC',     // Decimal numbers
    TIMESTAMP = 'TIMESTAMP', // Date and time
    BOOLEAN = 'BOOLEAN',     // True/false
    VARCHAR = 'VARCHAR'      // Text
}

// Helper function to validate data type
export function isValidDataType(type: string): boolean {
    return Object.values(DataType).includes(type as DataType);
}

// Helper function to get default value for a data type
export function getDefaultValue(type: string): any {
    switch (type) {
        case DataType.INTEGER:
            return 0;
        case DataType.NUMERIC:
            return 0.0;
        case DataType.TIMESTAMP:
            return new Date(0).toISOString();
        case DataType.BOOLEAN:
            return false;
        case DataType.VARCHAR:
            return null;
        default:
            return null;
    }
} 