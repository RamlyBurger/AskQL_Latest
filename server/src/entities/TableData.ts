import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Table } from "./Table";

@Entity('table_data')
export class TableData {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    table_id: number;

    @ManyToOne(() => Table, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'table_id', referencedColumnName: 'id' })
    table: Table;

    @Column({ type: 'simple-json' })
    row_data: Record<string, any>;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
} 