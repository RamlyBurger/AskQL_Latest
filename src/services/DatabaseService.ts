import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export interface Database {
    id: number;
    name: string;
    description?: string;
    database_type: string;
    created_at: Date;
    updated_at: Date;
    tables?: Table[];
}

export interface Table {
    id: number;
    database_id: number;
    name: string;
    description?: string;
    created_at: Date;
    updated_at: Date;
    attributes?: Attribute[];
}

export interface Attribute {
    id: number;
    table_id: number;
    name: string;
    data_type: string;
    is_nullable: boolean;
    is_primary_key: boolean;
    is_foreign_key: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface TableData {
    id: number;
    table_id: number;
    row_data: Record<string, any>;
    created_at: Date;
    updated_at: Date;
}

export interface TableDataPagination {
    data: TableData[];
    total: number;
    page: number;
    pageSize: number;
    columnTypes: Record<string, string>;
}

export interface DatabaseFormData {
    name: string;
    description?: string;
    database_type: string;
}

export interface TableFormData {
    name: string;
    description?: string;
    attributes?: {
        name: string;
        data_type: string;
        is_nullable: boolean;
        is_primary_key: boolean;
        is_foreign_key: boolean;
    }[];
}

export interface AttributeFormData {
    name: string;
    data_type: string;
    is_nullable: boolean;
    is_primary_key: boolean;
    is_foreign_key: boolean;
}

export class DatabaseService {
    // Database operations
    static async getAllDatabases(): Promise<Database[]> {
        try {
            const response = await axios.get(`${API_URL}/databases`);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching databases:', error);
            throw error;
        }
    }

    static async getDatabaseById(id: number): Promise<Database> {
        try {
            const response = await axios.get(`${API_URL}/databases/${id}`);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching database:', error);
            throw error;
        }
    }

    static async createDatabase(data: DatabaseFormData): Promise<Database> {
        try {
            const response = await axios.post(`${API_URL}/databases`, data);
            return response.data.data;
        } catch (error) {
            console.error('Error creating database:', error);
            throw error;
        }
    }

    static async updateDatabase(id: number, data: Partial<DatabaseFormData>): Promise<Database> {
        try {
            const response = await axios.put(`${API_URL}/databases/${id}`, data);
            return response.data.data;
        } catch (error) {
            console.error('Error updating database:', error);
            throw error;
        }
    }

    static async deleteDatabase(id: number): Promise<void> {
        try {
            await axios.delete(`${API_URL}/databases/${id}`);
        } catch (error) {
            console.error('Error deleting database:', error);
            throw error;
        }
    }

    // Table operations
    static async getTableById(tableId: number): Promise<Table> {
        try {
            const response = await axios.get(`${API_URL}/tables/${tableId}`);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching table:', error);
            throw error;
        }
    }

    static async createTable(databaseId: number, data: TableFormData): Promise<Table> {
        try {
            const response = await axios.post(`${API_URL}/tables/database/${databaseId}`, data);
            return response.data.data;
        } catch (error) {
            console.error('Error creating table:', error);
            throw error;
        }
    }

    static async updateTable(tableId: number, data: TableFormData): Promise<Table> {
        try {
            const response = await axios.put(`${API_URL}/tables/${tableId}`, data);
            return response.data.data;
        } catch (error) {
            console.error('Error updating table:', error);
            throw error;
        }
    }

    static async deleteTable(tableId: number): Promise<void> {
        try {
            await axios.delete(`${API_URL}/tables/${tableId}`);
        } catch (error) {
            console.error('Error deleting table:', error);
            throw error;
        }
    }

    // Table Data operations
    static async getTableData(
        tableId: number,
        page: number = 1,
        pageSize: number = 10,
        sortColumn?: string,
        sortOrder?: 'asc' | 'desc',
        showTopN?: number
    ): Promise<TableDataPagination> {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                ...(sortColumn && { sortColumn }),
                ...(sortOrder && { sortOrder }),
                ...(showTopN && { showTopN: showTopN.toString() })
            });

            const response = await axios.get(`${API_URL}/tableData/${tableId}/data`, {
                params: { page, pageSize, sortColumn, sortOrder, showTopN }
            });
            return response.data.data;
        } catch (error) {
            console.error('Error in getTableData:', error);
            throw error;
        }
    }

    static async insertTableData(tableId: number, data: Record<string, any>): Promise<TableData> {
        try {
            const response = await axios.post(`${API_URL}/tableData/${tableId}/data`, { data: [data] });
            return response.data.data[0]; // Return the first (and only) inserted record
        } catch (error) {
            console.error('Error inserting table data:', error);
            throw error;
        }
    }

    static async updateTableRow(tableId: number, rowId: number, data: Record<string, any>): Promise<TableData> {
        try {
            const response = await axios.put(`${API_URL}/tableData/${tableId}/data/${rowId}`, { row_data: data });
            return response.data.data;
        } catch (error) {
            console.error('Error updating table row:', error);
            throw error;
        }
    }

    static async deleteTableRow(tableId: number, rowId: number): Promise<void> {
        try {
            console.log(`Deleting row ${rowId} from table ${tableId}`);
            const response = await axios.delete(`${API_URL}/tableData/${tableId}/data/${rowId}`);
            console.log('Delete response:', response.data);
        } catch (error) {
            console.error('Error deleting table row:', error);
            throw error;
        }
    }

    static async importCSV(databaseId: number, name: string, description: string, file: File): Promise<any> {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', name);
            formData.append('description', description);

            const response = await axios.post(
                `${API_URL}/csv/import/${databaseId}`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error importing CSV:', error);
            throw error;
        }
    }

    // Attribute operations
    static async addTableAttribute(tableId: number, data: AttributeFormData): Promise<Attribute> {
        try {
            const response = await axios.post(`${API_URL}/tables/${tableId}/attributes`, data);
            return response.data.data;
        } catch (error) {
            console.error('Error adding attribute:', error);
            throw error;
        }
    }

    static async updateTableAttribute(tableId: number, attributeId: number, data: AttributeFormData): Promise<Attribute> {
        try {
            const response = await axios.put(`${API_URL}/tables/${tableId}/attributes/${attributeId}`, data);
            return response.data.data;
        } catch (error) {
            console.error('Error updating attribute:', error);
            throw error;
        }
    }

    static async deleteTableAttribute(tableId: number, attributeId: number): Promise<void> {
        try {
            await axios.delete(`${API_URL}/tables/${tableId}/attributes/${attributeId}`);
        } catch (error) {
            console.error('Error deleting attribute:', error);
            throw error;
        }
    }
} 