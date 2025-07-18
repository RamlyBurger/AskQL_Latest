import { v4 as uuidv4 } from 'uuid';
import axios from 'axios'; // Added axios import

export interface ChatMessage {
    id: string;
    session_id: string;
    sender: 'user' | 'bot';
    content: string;
    message_type: 'text' | 'image' | 'file' | 'voice' | 'combined';
    created_at: Date;
    sql_query?: string;
    file_url?: string;
    file_name?: string;
    query_type?: string;
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
        try {
            const sessionsJson = localStorage.getItem(this.SESSIONS_KEY) || '[]';
            const sessions = JSON.parse(sessionsJson) as ChatSession[];
            // Parse dates
            sessions.forEach(s => {
                s.created_at = new Date(s.created_at);
            });
            // Filter and sort by creation date (newest first)
            return sessions
                .filter(s => s.database_id === database_id)
                .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        } catch (error) {
            console.error('Error loading sessions:', error);
            return [];
        }
    }

    // Create a new session
    static async createSession(database_id: number, title: string): Promise<ChatSession> {
        try {
            const session: ChatSession = {
                id: uuidv4(),
                database_id,
                title,
                created_at: new Date()
            };

            // Get all existing sessions
            const sessionsJson = localStorage.getItem(this.SESSIONS_KEY) || '[]';
            const allSessions = JSON.parse(sessionsJson) as ChatSession[];
            
            // Add new session
            allSessions.push(session);
            
            // Save all sessions
            localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(allSessions));

            return session;
        } catch (error) {
            console.error('Error creating session:', error);
            throw new Error('Failed to create chat session');
        }
    }

    // Get messages for a session
    static async getSessionMessages(session_id: string): Promise<ChatMessage[]> {
        try {
            const messagesJson = localStorage.getItem(this.MESSAGES_KEY) || '[]';
            const messages = JSON.parse(messagesJson) as ChatMessage[];
            
            // Parse dates
            messages.forEach(m => {
                m.created_at = new Date(m.created_at);
            });
            
            // Filter and sort by creation date
            return messages
                .filter(m => m.session_id === session_id)
                .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
        } catch (error) {
            console.error('Error loading messages:', error);
            return [];
        }
    }

    // Add a new message
    static async addMessage(message: Omit<ChatMessage, 'id' | 'created_at'>): Promise<ChatMessage> {
        try {
            const newMessage: ChatMessage = {
                ...message,
                id: uuidv4(),
                created_at: new Date()
            };

            // Get all existing messages
            const messagesJson = localStorage.getItem(this.MESSAGES_KEY) || '[]';
            const allMessages = JSON.parse(messagesJson) as ChatMessage[];
            
            // Add new message
            allMessages.push(newMessage);
            
            // Save all messages
            localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(allMessages));

            return newMessage;
        } catch (error) {
            console.error('Error adding message:', error);
            throw new Error('Failed to add message');
        }
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

    static async deleteSession(sessionId: string): Promise<void> {
        try {
            // Delete session
            const sessionsJson = localStorage.getItem(this.SESSIONS_KEY) || '[]';
            const allSessions = JSON.parse(sessionsJson) as ChatSession[];
            const updatedSessions = allSessions.filter(s => s.id !== sessionId);
            localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(updatedSessions));

            // Delete associated messages
            const messagesJson = localStorage.getItem(this.MESSAGES_KEY) || '[]';
            const allMessages = JSON.parse(messagesJson) as ChatMessage[];
            const updatedMessages = allMessages.filter(m => m.session_id !== sessionId);
            localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(updatedMessages));
        } catch (error) {
            console.error('Error deleting session:', error);
            throw new Error('Failed to delete chat session');
        }
    }

    // Clear all chat data (for testing/debugging)
    static async clearAll(): Promise<void> {
        localStorage.removeItem(this.SESSIONS_KEY);
        localStorage.removeItem(this.MESSAGES_KEY);
    }
}

export default ChatService; 