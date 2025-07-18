import express from 'express';
import ChatController from '../controllers/ChatController';

const router = express.Router();

// Chat History
router.get('/history', ChatController.getChatHistory);
router.post('/messages', ChatController.addMessage);

// File Upload
router.post('/upload', ChatController.uploadFile);

export default router; 