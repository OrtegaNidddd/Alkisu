import { notificaciones } from '../notificaciones/index.js';
import * as materialService from '../services/material.service.js';
export const handleCreateMaterial = async (req, res) => {
    const { name, type, unit, stock, minStock } = req.body;
    if (!name || !type || !unit || stock === undefined || minStock === undefined) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    const material = await materialService.createMaterial({
        name,
        type,
        unit,
        stock: Number(stock),
        minStock: Number(minStock),
    });
    res.status(201).json(material);
};
export const handleUpdateMaterial = async (req, res) => {
    const { id } = req.params;
    const { name, type, unit, minStock, stock } = req.body;
    const material = await materialService.updateMaterial(id, {
        name,
        type,
        unit,
        minStock: minStock !== undefined ? Number(minStock) : undefined,
        stock: stock !== undefined ? Number(stock) : undefined,
    }, req.user?.id, req.ip);
    res.status(200).json(material);
};
export const handleGetMaterials = async (_req, res) => {
    const materials = await materialService.getMaterials();
    res.json(materials);
};
export const handleRestockMaterial = async (req, res) => {
    const { quantity } = req.body;
    const { id: materialId } = req.params;
    if (!quantity || Number(quantity) <= 0) {
        return res.status(400).json({ error: 'Debes indicar una cantidad válida mayor a 0' });
    }
    const material = await materialService.restockMaterial({
        materialId,
        quantity: Number(quantity),
        userId: req.user.id,
        ipAddress: req.ip,
    });
    res.status(200).json({
        message: `Stock reabastecido exitosamente (+${quantity} ${material.unit})`,
        material,
    });
};
export const handleConsumeMaterial = async (req, res) => {
    const { materialId, quantity } = req.body;
    const { id: orderId } = req.params;
    if (!materialId || !quantity || Number(quantity) <= 0) {
        return res.status(400).json({ error: 'Material ID y cantidad válida son requeridos' });
    }
    const result = await materialService.consumeMaterialInOrder({
        orderId,
        materialId,
        quantity: Number(quantity),
        userId: req.user.id,
        ipAddress: req.ip,
    });
    // Si el stock quedó por debajo o igual al mínimo, disparar la alerta asíncrona
    if (result.isLowStock) {
        void notificaciones.enviarAlertaStockBajo({
            materialName: result.materialName,
            remainingStock: result.remainingStock,
            unit: result.unit,
        });
    }
    res.status(200).json(result);
};
