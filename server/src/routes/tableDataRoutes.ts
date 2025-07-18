import express from 'express';
import { TableDataController } from '../controllers/TableDataController';

const router = express.Router();
const tableDataController = new TableDataController();

// Execute custom SQL query
router.post('/execute-query', (req, res) => tableDataController.executeQuery(req, res));

// Get table data samples
router.get('/:tableId/data', (req, res) => tableDataController.getTableData(req, res));

// Store table data samples
router.post('/:tableId/data', (req, res) => tableDataController.storeTableData(req, res));

// Update a single row of data
router.put('/:tableId/data/:rowId', (req, res) => tableDataController.updateTableDataRow(req, res));

// Delete a single row of data
router.delete('/:tableId/data/:rowId', (req, res) => tableDataController.deleteTableDataRow(req, res));

// Delete all data for a table
router.delete('/:tableId/data', (req, res) => tableDataController.deleteAllTableData(req, res));

export default router; 