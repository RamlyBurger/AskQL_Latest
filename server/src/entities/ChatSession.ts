import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ChatMessage } from './ChatMessage';

@Entity()
export class ChatSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    database_id: number;

    @Column()
    title: string;

    @CreateDateColumn()
    created_at: Date;

    @OneToMany(() => ChatMessage, message => message.session)
    messages: ChatMessage[];
} 