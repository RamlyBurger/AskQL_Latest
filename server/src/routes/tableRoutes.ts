import express from 'express';
import { TableController } from '../controllers/TableController';

const router = express.Router();
const tableController = new TableController();

// Get tables by database ID
router.get('/database/:databaseId', (req, res) => tableController.getTablesByDatabaseId(req, res));

// Get single table by ID
router.get('/:id', (req, res) => tableController.getTableById(req, res));

// Create new table
router.post('/database/:databaseId', (req, res) => tableController.createTable(req, res));

// Update table
router.put('/:id', (req, res) => tableController.updateTable(req, res));

// Delete table
router.delete('/:id', (req, res) => tableController.deleteTable(req, res));

export default router; 