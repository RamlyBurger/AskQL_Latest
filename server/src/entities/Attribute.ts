import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from "typeorm";
import { Table } from "./Table";

@Entity()
@Unique(['name', 'table_id'])
export class Attribute {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ type: 'text' })
    data_type: string;

    @Column({ type: 'text', nullable: true })
    format: string | null;

    @Column({ default: true })
    is_nullable: boolean;

    @Column({ default: false })
    is_primary_key: boolean;

    @Column({ default: false })
    is_foreign_key: boolean;

    @ManyToOne(() => Table, table => table.attributes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'table_id' })
    table: Table;

    @Column()
    table_id: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
} 