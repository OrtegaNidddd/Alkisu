import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { sendLowStockAlert } from '../services/email.service.js';
import * as materialService from '../services/material.service.js';

export const handleCreateMaterial = async (req: AuthenticatedRequest, res: Response) => {
  try {
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
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al registrar material' });
  }
};

export const handleUpdateMaterial = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, unit, minStock, stock } = req.body;

    const material = await materialService.updateMaterial(
      id,
      {
        name,
        type,
        unit,
        minStock: minStock !== undefined ? Number(minStock) : undefined,
        stock: stock !== undefined ? Number(stock) : undefined,
      },
      req.user?.id,
      req.ip
    );

    res.status(200).json(material);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al actualizar material' });
  }
};

export const handleGetMaterials = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const materials = await materialService.getMaterials();
    res.json(materials);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar inventario de materiales' });
  }
};

export const handleRestockMaterial = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quantity } = req.body;
    const { id: materialId } = req.params;

    if (!quantity || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'Debes indicar una cantidad válida mayor a 0' });
    }

    const material = await materialService.restockMaterial({
      materialId,
      quantity: Number(quantity),
      userId: req.user!.id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: `Stock reabastecido exitosamente (+${quantity} ${material.unit})`,
      material,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al reabastecer el material' });
  }
};

export const handleConsumeMaterial = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { materialId, quantity } = req.body;
    const { id: orderId } = req.params;

    if (!materialId || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'Material ID y cantidad válida son requeridos' });
    }

    const result = await materialService.consumeMaterialInOrder({
      orderId,
      materialId,
      quantity: Number(quantity),
      userId: req.user!.id,
      ipAddress: req.ip,
    });

    // Si el stock quedó por debajo o igual al mínimo, disparar la alerta asíncrona
    if (result.isLowStock) {
      sendLowStockAlert({
        materialName: result.materialName,
        remainingStock: result.remainingStock,
        unit: result.unit,
      }).catch((err) => console.error('[Brevo] Falló el envío en segundo plano:', err));
    }

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};