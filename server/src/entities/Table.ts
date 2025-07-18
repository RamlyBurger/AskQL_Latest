import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { Database } from "./Database";
import { Attribute } from "./Attribute";

@Entity()
export class Table {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true, type: 'text' })
    description: string;

    @ManyToOne(() => Database, database => database.tables, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'database_id' })
    database: Database;

    @Column()
    database_id: number;

    @OneToMany(() => Attribute, attribute => attribute.table, { cascade: true })
    attributes: Attribute[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
} 