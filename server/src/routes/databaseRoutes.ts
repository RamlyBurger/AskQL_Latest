import express from 'express';
import { DatabaseController } from '../controllers/DatabaseController';

const router = express.Router();

// Special routes that need to come first
router.post('/reset', DatabaseController.resetDatabase);
router.get('/statistics', DatabaseController.getStatistics);

// Standard CRUD routes
router.get('/', DatabaseController.getAllDatabases);
router.post('/', DatabaseController.createDatabase);

// Routes with parameters
router.get('/:id', DatabaseController.getDatabaseById);
router.put('/:id', DatabaseController.updateDatabase);
router.delete('/:id', DatabaseController.deleteDatabase);

export default router;