import express from 'express';
import { AttributeController } from '../controllers/AttributeController';

const router = express.Router();
const attributeController = new AttributeController();

// Get attributes by table ID
router.get('/tables/:tableId/attributes', (req, res) => attributeController.getAttributesByTableId(req, res));

// Create new attribute
router.post('/tables/:tableId/attributes', (req, res) => attributeController.createAttribute(req, res));

// Update attribute
router.put('/tables/:tableId/attributes/:attributeId', (req, res) => attributeController.updateAttribute(req, res));

// Delete attribute
router.delete('/tables/:tableId/attributes/:attributeId', (req, res) => attributeController.deleteAttribute(req, res));

export default router; 