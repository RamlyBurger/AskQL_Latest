// PostgreSQL error interface
export interface PostgresError extends Error {
    code?: string;
} 