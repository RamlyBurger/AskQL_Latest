import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
    id?: string;
    session_id: string;
    sender: 'user' | 'bot';
    content: string;
    message_type: 'text' | 'image' | 'file' | 'voice';
    file_url?: string;
    file_name?: string;
    sql_query?: string;
    created_at: Date;
}

export interface ChatSession {
    id: string;
    database_id: number;
    title: string;
    created_at: Date;
}

class ChatService {
    private static SESSIONS_KEY = 'chat_sessions';
    private static MESSAGES_KEY = 'chat_messages';

    // Get all sessions for a database
    static async getSessions(database_id: number): Promise<ChatSession[]> {
        const sessionsJson = localStorage.getItem(this.SESSIONS_KEY) || '[]';
        const sessions = JSON.parse(sessionsJson) as ChatSession[];
        return sessions.filter(s => s.database_id === database_id);
    }

    // Create a new session
    static async createSession(database_id: number, title: string): Promise<ChatSession> {
        const session: ChatSession = {
            id: uuidv4(),
            database_id,
            title,
            created_at: new Date()
        };

        const sessions = await this.getSessions(database_id);
        sessions.push(session);
        localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));

        return session;
    }

    // Get messages for a session
    static async getSessionMessages(session_id: string): Promise<ChatMessage[]> {
        const messagesJson = localStorage.getItem(this.MESSAGES_KEY) || '[]';
        const messages = JSON.parse(messagesJson) as ChatMessage[];
        return messages.filter(m => m.session_id === session_id);
    }

    // Add a new message
    static async addMessage(message: Omit<ChatMessage, 'id' | 'created_at'>): Promise<ChatMessage> {
        const newMessage: ChatMessage = {
            ...message,
            id: uuidv4(),
            created_at: new Date()
        };

        const messages = await this.getSessionMessages(message.session_id);
        messages.push(newMessage);
        localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages));

        return newMessage;
    }

    // Upload a file (stores in local storage as data URL)
    static async uploadFile(file: File): Promise<{ url: string }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve({ url: reader.result as string });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

export default ChatService; 