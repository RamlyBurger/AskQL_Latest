import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/database';
import { ChatMessage } from '../entities/ChatMessage';
import { ChatSession } from '../entities/ChatSession';

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage }).single('file');

class ChatController {
    // Create a new chat session
    static async createSession(req: Request, res: Response) {
        try {
            const { database_id, title } = req.body;
            
            if (!database_id || !title) {
                return res.status(400).json({
                    success: false,
                    message: 'Database ID and title are required'
                });
            }

            const session = AppDataSource
                .getRepository(ChatSession)
                .create({
                    database_id: parseInt(database_id),
                    title
                });
            
            await AppDataSource.getRepository(ChatSession).save(session);
            
            res.json({
                success: true,
                data: session
            });
        } catch (error) {
            console.error('Error creating chat session:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create chat session'
            });
        }
    }

    // Get chat sessions for a database
    static async getChatHistory(req: Request, res: Response) {
        try {
            const database_id = parseInt(req.query.database_id as string);
            
            if (isNaN(database_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid database ID'
                });
            }

            const sessions = await AppDataSource
                .getRepository(ChatSession)
                .find({
                    where: { database_id },
                    order: { created_at: 'DESC' }
                });
            
            res.json({
                success: true,
                data: sessions
            });
        } catch (error) {
            console.error('Error fetching chat history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch chat history'
            });
        }
    }

    // Get messages for a specific session
    static async getSessionMessages(req: Request, res: Response) {
        try {
            const sessionId = req.query.session_id as string;
            
            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'Session ID is required'
                });
            }

            const messages = await AppDataSource
                .getRepository(ChatMessage)
                .find({
                    where: { session_id: sessionId },
                    order: { created_at: 'ASC' }
                });
            
            res.json({
                success: true,
                data: messages
            });
        } catch (error) {
            console.error('Error fetching session messages:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch session messages'
            });
        }
    }

    // Add a new message
    static async addMessage(req: Request, res: Response) {
        try {
            const { session_id, sender, content, message_type, file_url, file_name, sql_query, query_type } = req.body;
            
            if (!session_id || !sender || !content) {
                return res.status(400).json({
                    success: false,
                    message: 'Session ID, sender, and content are required'
                });
            }

            const message = AppDataSource
                .getRepository(ChatMessage)
                .create({
                    session_id,
                    sender,
                    content,
                    message_type: message_type || 'text',
                    file_url,
                    file_name,
                    sql_query,
                    query_type
                });
            
            await AppDataSource.getRepository(ChatMessage).save(message);
            
            res.json({
                success: true,
                data: message
            });
        } catch (error) {
            console.error('Error adding message:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add message'
            });
        }
    }

    // Delete a chat session and its messages
    static async deleteSession(req: Request, res: Response) {
        try {
            const sessionId = req.params.sessionId;
            
            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'Session ID is required'
                });
            }

            // Delete all messages for this session first
            await AppDataSource
                .getRepository(ChatMessage)
                .delete({ session_id: sessionId });

            // Then delete the session itself
            await AppDataSource
                .getRepository(ChatSession)
                .delete({ id: sessionId });
            
            res.json({
                success: true,
                message: 'Chat session deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting chat session:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete chat session'
            });
        }
    }

    // Handle file upload
    static async uploadFile(req: Request, res: Response) {
        upload(req, res, async (err) => {
            if (err) {
                console.error('Error uploading file:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload file'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file provided'
                });
            }

            // Generate URL for the uploaded file
            const fileUrl = `/uploads/${req.file.filename}`;

            res.json({
                success: true,
                data: {
                    url: fileUrl,
                    originalName: req.file.originalname
                }
            });
        });
    }
}

export default ChatController; 