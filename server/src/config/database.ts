import { DataSource } from 'typeorm';
import { Database } from '../entities/Database';
import { Table } from '../entities/Table';
import { Attribute } from '../entities/Attribute';
import { TableData } from '../entities/TableData';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: '1234',
    database: 'askql_db',
    synchronize: true,
    logging: true,
    entities: [Database, Table, Attribute, TableData],
    subscribers: [],
    migrations: [],
}); 