import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChatSession } from './ChatSession';

@Entity()
export class ChatMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    session_id: string;

    @ManyToOne(() => ChatSession, session => session.messages)
    @JoinColumn({ name: 'session_id' })
    session: ChatSession;

    @Column()
    sender: 'user' | 'bot';

    @Column('text')
    content: string;

    @Column()
    message_type: 'text' | 'image' | 'file' | 'voice' | 'combined';

    @Column({ nullable: true })
    sql_query?: string;

    @Column({ nullable: true })
    file_url?: string;

    @Column({ nullable: true })
    file_name?: string;

    @Column({ type: 'text', nullable: true })
    query_type?: string;

    @CreateDateColumn()
    created_at: Date;
} 