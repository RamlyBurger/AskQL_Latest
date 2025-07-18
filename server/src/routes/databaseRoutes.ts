import express from 'express';
import { DatabaseController } from '../controllers/DatabaseController';

const router = express.Router();
const databaseController = new DatabaseController();

// Get all databases
router.get('/', (req, res) => databaseController.getAllDatabases(req, res));

// Get database by ID
router.get('/:id', (req, res) => databaseController.getDatabaseById(req, res));

// Create new database
router.post('/', (req, res) => databaseController.createDatabase(req, res));

// Update database
router.put('/:id', (req, res) => databaseController.updateDatabase(req, res));

// Delete database
router.delete('/:id', (req, res) => databaseController.deleteDatabase(req, res));

export default router; 