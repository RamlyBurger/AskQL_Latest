import express from 'express';
import multer from 'multer';
import GeminiController from '../controllers/GeminiController';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Column type detection endpoint
router.post('/detect-types', GeminiController.detectColumnTypes.bind(GeminiController));

// Chat endpoint (text-based)
router.post('/chat', GeminiController.chat.bind(GeminiController));

// Multiple images processing endpoint
router.post('/process-images', GeminiController.processImages.bind(GeminiController));

// Single image processing endpoint (legacy)
router.post('/process-image', upload.single('image'), GeminiController.processImage.bind(GeminiController));

// File processing endpoint
router.post('/process-file', upload.single('file'), GeminiController.processFile.bind(GeminiController));

// Voice transcription endpoint
router.post('/transcribe-voice', upload.single('audio'), GeminiController.transcribeVoice.bind(GeminiController));

export default router; 