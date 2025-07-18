import { parse, format as formatDate } from 'date-fns';

export interface TimestampFormat {
    format: string;
    example: string;
    description: string;
    parser: (value: string) => Date;
}

// Define common timestamp formats
export const TIMESTAMP_FORMATS: TimestampFormat[] = [
    {
        format: 'HH:mm',
        example: '13:59',
        description: '24-hour time',
        parser: (value: string) => parse(value, 'HH:mm', new Date())
    },
    {
        format: 'HH:mm:ss',
        example: '13:59:59',
        description: '24-hour time with seconds',
        parser: (value: string) => parse(value, 'HH:mm:ss', new Date())
    },
    {
        format: 'dd/MM/yyyy',
        example: '31/12/2023',
        description: 'UK date format',
        parser: (value: string) => parse(value, 'dd/MM/yyyy', new Date())
    },
    {
        format: 'MM/dd/yyyy',
        example: '12/31/2023',
        description: 'US date format',
        parser: (value: string) => parse(value, 'MM/dd/yyyy', new Date())
    },
    {
        format: 'yyyy-MM-dd',
        example: '2023-12-31',
        description: 'ISO date format',
        parser: (value: string) => parse(value, 'yyyy-MM-dd', new Date())
    },
    {
        format: 'dd/MM/yyyy HH:mm',
        example: '31/12/2023 13:59',
        description: 'UK date and time',
        parser: (value: string) => parse(value, 'dd/MM/yyyy HH:mm', new Date())
    },
    {
        format: 'MM/dd/yyyy HH:mm',
        example: '12/31/2023 13:59',
        description: 'US date and time',
        parser: (value: string) => parse(value, 'MM/dd/yyyy HH:mm', new Date())
    },
    {
        format: 'yyyy-MM-dd HH:mm',
        example: '2023-12-31 13:59',
        description: 'ISO date and time',
        parser: (value: string) => parse(value, 'yyyy-MM-dd HH:mm', new Date())
    },
    {
        format: 'dd/MM/yyyy HH:mm:ss',
        example: '31/12/2023 13:59:59',
        description: 'UK date and time with seconds',
        parser: (value: string) => parse(value, 'dd/MM/yyyy HH:mm:ss', new Date())
    },
    {
        format: 'MM/dd/yyyy HH:mm:ss',
        example: '12/31/2023 13:59:59',
        description: 'US date and time with seconds',
        parser: (value: string) => parse(value, 'MM/dd/yyyy HH:mm:ss', new Date())
    },
    {
        format: 'yyyy-MM-dd HH:mm:ss',
        example: '2023-12-31 13:59:59',
        description: 'ISO date and time with seconds',
        parser: (value: string) => parse(value, 'yyyy-MM-dd HH:mm:ss', new Date())
    },
    {
        format: 'yyyy-MM-dd\'T\'HH:mm:ss',
        example: '2023-12-31T13:59:59',
        description: 'ISO date and time with T separator',
        parser: (value: string) => parse(value, 'yyyy-MM-dd\'T\'HH:mm:ss', new Date())
    },
    {
        format: 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'',
        example: '2023-12-31T13:59:59.123Z',
        description: 'ISO date and time with milliseconds and Z',
        parser: (value: string) => new Date(value)
    }
];

export function detectTimestampFormat(sampleValues: string[]): TimestampFormat | null {
    // Remove empty values
    const nonEmptyValues = sampleValues.filter(val => val && val.trim());
    if (nonEmptyValues.length === 0) return null;

    // Try each format until we find one that works for all values
    for (const format of TIMESTAMP_FORMATS) {
        try {
            // Check if all values can be parsed with this format
            const allValid = nonEmptyValues.every(value => {
                try {
                    const parsed = format.parser(value.trim());
                    return parsed instanceof Date && !isNaN(parsed.getTime());
                } catch {
                    return false;
                }
            });

            if (allValid) {
                return format;
            }
        } catch {
            continue;
        }
    }

    return null;
}

export function parseTimestamp(value: string, format: TimestampFormat): Date | null {
    if (!value || !value.trim()) return null;
    
    try {
        const parsed = format.parser(value.trim());
        return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : null;
    } catch {
        return null;
    }
}

export function formatTimestamp(date: Date, format: TimestampFormat): string {
    try {
        return format.format.includes('T') 
            ? date.toISOString() 
            : format.format.includes('Z')
                ? date.toISOString()
                : formatDate(date, format.format);
    } catch {
        return date.toISOString();
    }
} 