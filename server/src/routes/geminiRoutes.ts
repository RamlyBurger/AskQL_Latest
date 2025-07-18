import express from 'express';
import { GeminiController } from '../controllers/GeminiController';

const router = express.Router();

router.post('/detect-types', GeminiController.detectColumnTypes);

export default router; 