import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/database';
import { ChatMessage } from '../entities/ChatMessage';

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
    // Get chat history for a database
    static async getChatHistory(req: Request, res: Response) {
        try {
            const database_id = parseInt(req.query.database_id as string);
            
            if (isNaN(database_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid database ID'
                });
            }

            const messages = await AppDataSource
                .getRepository(ChatMessage)
                .find({
                    where: { database_id },
                    order: { created_at: 'ASC' }
                });
            
            res.json({
                success: true,
                data: messages
            });
        } catch (error) {
            console.error('Error fetching chat history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch chat history'
            });
        }
    }

    // Add a new message
    static async addMessage(req: Request, res: Response) {
        try {
            const { database_id, sender, content, message_type, file_url, file_name, sql_query } = req.body;
            
            if (!database_id || !sender || !content) {
                return res.status(400).json({
                    success: false,
                    message: 'Database ID, sender, and content are required'
                });
            }

            const message = AppDataSource
                .getRepository(ChatMessage)
                .create({
                    database_id: parseInt(database_id),
                    sender,
                    content,
                    message_type: message_type || 'text',
                    file_url,
                    file_name,
                    sql_query
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