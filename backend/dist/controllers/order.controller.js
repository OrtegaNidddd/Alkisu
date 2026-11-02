import * as orderService from '../services/order.service.js';
import { OrderStatus } from '@prisma/client';
export const handleCreateOrder = async (req, res) => {
    try {
        const { clientId, artisanId, description, totalPactado, estimatedDelivery } = req.body;
        if (!clientId || !description || totalPactado === undefined) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        const order = await orderService.createOrder({
            clientId,
            createdById: req.user.id,
            artisanId,
            description,
            totalPactado: Number(totalPactado),
            estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
        });
        res.status(201).json(order);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Error al crear pedido' });
    }
};
export const handleGetOrders = async (req, res) => {
    try {
        const { status, artisanId, clientId, page, limit } = req.query;
        if (status && !Object.values(OrderStatus).includes(status)) {
            return res.status(400).json({
                error: `Estado inválido. Opciones válidas: ${Object.values(OrderStatus).join(', ')}`,
            });
        }
        const result = await orderService.getOrders({
            status: status,
            artisanId: artisanId,
            clientId: clientId,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al consultar la lista de pedidos' });
    }
};
export const handleGetOrder = async (req, res) => {
    try {
        const order = await orderService.getOrderById(req.params.id);
        if (!order)
            return res.status(404).json({ error: 'Pedido no encontrado' });
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al consultar pedido' });
    }
};
export const handleAddPayment = async (req, res) => {
    try {
        const { amount, paymentMethod, referenceNotes } = req.body;
        if (!amount || !paymentMethod) {
            return res.status(400).json({ error: 'Monto y método de pago requeridos' });
        }
        const result = await orderService.addPayment({
            orderId: req.params.id,
            registeredById: req.user.id,
            amount: Number(amount),
            paymentMethod,
            referenceNotes,
        });
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
export const handleUpdateStatus = async (req, res) => {
    try {
        const { status, note, artisanId, newStatus } = req.body;
        const targetStatus = status || newStatus;
        if (!targetStatus)
            return res.status(400).json({ error: 'El estado es obligatorio' });
        await orderService.updateOrderStatus({
            orderId: req.params.id,
            userId: req.user.id,
            newStatus: targetStatus,
            note,
            artisanId,
        });
        res.json({ message: `Estado actualizado a ${targetStatus}` });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
export const handleGetOrderMaterials = async (req, res) => {
    try {
        const materials = await orderService.getOrderMaterials(req.params.id);
        res.json(materials);
    }
    catch (error) {
        const status = error.message === 'Pedido no encontrado' ? 404 : 500;
        res.status(status).json({ error: error.message || 'Error al consultar materiales del pedido' });
    }
};
export const handleCancelOrder = async (req, res) => {
    try {
        const { reason } = req.body;
        const { id: orderId } = req.params;
        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({ error: 'El motivo de cancelación es obligatorio' });
        }
        await orderService.cancelOrder({
            orderId,
            userId: req.user.id,
            reason,
        });
        res.json({ message: 'Pedido cancelado correctamente y registrado en historial' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
export const handleRegisterMetalReturn = async (req, res) => {
    try {
        const { materialId, finalPieceWeight, scrapWeight, notes } = req.body;
        const { id: orderId } = req.params;
        if (!materialId || finalPieceWeight === undefined || scrapWeight === undefined) {
            return res.status(400).json({
                error: 'materialId, finalPieceWeight y scrapWeight son obligatorios',
            });
        }
        if (Number(finalPieceWeight) <= 0 || Number(scrapWeight) < 0) {
            return res.status(400).json({
                error: 'El peso de la joya debe ser mayor a 0 y la limalla no puede ser negativa',
            });
        }
        const result = await orderService.registerMetalReturn({
            orderId,
            materialId,
            artisanId: req.user.id,
            finalPieceWeight: Number(finalPieceWeight),
            scrapWeight: Number(scrapWeight),
            notes,
            ipAddress: req.ip,
        });
        res.status(200).json({
            message: 'Liquidación de metal y merma procesada exitosamente',
            ...result,
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
export const handleAssignArtisan = async (req, res) => {
    try {
        const { artisanId } = req.body;
        if (!artisanId)
            return res.status(400).json({ error: 'ID de joyero requerido' });
        const order = await orderService.assignArtisan(req.params.id, artisanId, req.user.id);
        res.json({ message: 'Joyero asignado correctamente', order });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
