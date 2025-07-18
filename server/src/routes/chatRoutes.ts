import { Router } from 'express';
import { AIAgentController } from '../controllers/AIAgentController';

const router = Router();

router.post('/chat', AIAgentController.chat);

export default router; 