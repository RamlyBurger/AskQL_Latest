import { Router } from 'express';
import multer from 'multer';
import { GeminiController } from '../controllers/GeminiController';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files at once
    }
});

// Route for processing a single image
router.post('/process-image', upload.single('image'), GeminiController.processImage);

// Route for processing multiple images
router.post('/process-images', upload.array('images', 5), GeminiController.processImages);

// Route for text-only chat
router.post('/chat', GeminiController.chat);

export default router; 