import { DataSource } from "typeorm";
import { Database } from "../entities/Database";
import { Table } from "../entities/Table";
import { Attribute } from "../entities/Attribute";
import { TableData } from "../entities/TableData";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const isDevelopment = process.env.NODE_ENV !== 'production';

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "1234",
    database: "askql_db",
    synchronize: true,
    logging: false,
    entities: [Database, Table, Attribute, TableData],
    migrations: [],
    subscribers: [],
}); 