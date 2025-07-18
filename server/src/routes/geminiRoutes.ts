import { Router } from 'express';
import multer from 'multer';
import { GeminiController } from '../controllers/GeminiController';
import { AIAgentController } from '../controllers/AIAgentController';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// AI Agent chat endpoint
router.post('/chat', AIAgentController.chat);

// CSV column type detection
router.post('/detect-column-types', GeminiController.detectColumnTypes);

// Media processing endpoints
router.post('/process-image', upload.single('image'), GeminiController.processImage);
router.post('/process-images', upload.array('images'), GeminiController.processImages);
router.post('/process-file', upload.single('file'), GeminiController.processFile);
router.post('/transcribe-voice', upload.single('audio'), GeminiController.transcribeVoice);

export default router; 