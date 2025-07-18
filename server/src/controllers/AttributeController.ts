import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Attribute } from '../entities/Attribute';
import { Table } from '../entities/Table';

export class AttributeController {
    private attributeRepository = AppDataSource.getRepository(Attribute);
    private tableRepository = AppDataSource.getRepository(Table);

    // Get attributes by table ID
    async getAttributesByTableId(req: Request, res: Response) {
        try {
            const { tableId } = req.params;
            const attributes = await this.attributeRepository.find({
                where: { table_id: parseInt(tableId) },
                order: { id: 'ASC' }
            });

            res.json({
                success: true,
                data: attributes
            });
        } catch (error) {
            console.error('Error fetching attributes:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch attributes'
            });
        }
    }

    // Create new attribute
    async createAttribute(req: Request, res: Response) {
        try {
            const { tableId } = req.params;
            const { name, data_type, is_nullable, is_primary_key, is_foreign_key } = req.body;

            // Check if table exists
            const table = await this.tableRepository.findOne({
                where: { id: parseInt(tableId) }
            });

            if (!table) {
                return res.status(404).json({
                    success: false,
                    error: 'Table not found'
                });
            }

            // Check if attribute name already exists in table
            const existingAttribute = await this.attributeRepository.findOne({
                where: { table_id: parseInt(tableId), name }
            });

            if (existingAttribute) {
                return res.status(400).json({
                    success: false,
                    error: 'Attribute with this name already exists in the table'
                });
            }

            const attribute = this.attributeRepository.create({
                table_id: parseInt(tableId),
                name,
                data_type,
                is_nullable,
                is_primary_key,
                is_foreign_key
            });

            await this.attributeRepository.save(attribute);

            res.status(201).json({
                success: true,
                data: attribute
            });
        } catch (error) {
            console.error('Error creating attribute:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create attribute'
            });
        }
    }

    // Update attribute
    async updateAttribute(req: Request, res: Response) {
        try {
            const { tableId, attributeId } = req.params;
            const { name, data_type, is_nullable, is_primary_key, is_foreign_key } = req.body;

            // Check if attribute exists
            const attribute = await this.attributeRepository.findOne({
                where: { id: parseInt(attributeId), table_id: parseInt(tableId) }
            });

            if (!attribute) {
                return res.status(404).json({
                    success: false,
                    error: 'Attribute not found'
                });
            }

            // Check if new name conflicts with existing attributes
            if (name !== attribute.name) {
                const existingAttribute = await this.attributeRepository.findOne({
                    where: { table_id: parseInt(tableId), name }
                });

                if (existingAttribute) {
                    return res.status(400).json({
                        success: false,
                        error: 'Attribute with this name already exists in the table'
                    });
                }
            }

            // Update attribute
            attribute.name = name;
            attribute.data_type = data_type;
            attribute.is_nullable = is_nullable;
            attribute.is_primary_key = is_primary_key;
            attribute.is_foreign_key = is_foreign_key;

            await this.attributeRepository.save(attribute);

            res.json({
                success: true,
                data: attribute
            });
        } catch (error) {
            console.error('Error updating attribute:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update attribute'
            });
        }
    }

    // Delete attribute
    async deleteAttribute(req: Request, res: Response) {
        try {
            const { tableId, attributeId } = req.params;

            const attribute = await this.attributeRepository.findOne({
                where: { id: parseInt(attributeId), table_id: parseInt(tableId) }
            });

            if (!attribute) {
                return res.status(404).json({
                    success: false,
                    error: 'Attribute not found'
                });
            }

            await this.attributeRepository.remove(attribute);

            res.json({
                success: true,
                message: 'Attribute deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting attribute:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete attribute'
            });
        }
    }
} 