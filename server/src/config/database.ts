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
    password: 'postgres',
    database: 'askql',
    synchronize: true,
    logging: true,
    entities: [Database, Table, Attribute, TableData],
    subscribers: [],
    migrations: [],
}); 