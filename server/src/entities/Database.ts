import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Table } from './Table';

export enum DatabaseType {
    POSTGRESQL = "postgresql",
    MYSQL = "mysql",
    MSSQL = "mssql",
    ORACLE = "oracle"
}

@Entity('database')
export class Database {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ unique: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'database_type' })
    database_type: string;

    @OneToMany(() => Table, table => table.database)
    tables: Table[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
} 