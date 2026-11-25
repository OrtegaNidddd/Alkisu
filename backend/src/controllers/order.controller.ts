import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as orderService from '../services/order.service.js';
import { registerMetalReturn } from '../services/metal.service.js';
import { OrderStatus } from '@prisma/client';

export const handleCreateOrder = async (req: AuthenticatedRequest, res: Response) => {
  const { clientId, artisanId, description, totalPactado, estimatedDelivery } = req.body;
  if (!clientId || !description || totalPactado === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const order = await orderService.createOrder({
    clientId,
    createdById: req.user!.id,
    artisanId,
    description,
    totalPactado: Number(totalPactado),
    estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
  });

  res.status(201).json(order);
};

export const handleGetOrders = async (req: AuthenticatedRequest, res: Response) => {
  const { status, artisanId, clientId, page, limit } = req.query;

  if (status && !Object.values(OrderStatus).includes(status as OrderStatus)) {
    return res.status(400).json({
      error: `Estado inválido. Opciones válidas: ${Object.values(OrderStatus).join(', ')}`,
    });
  }

  const result = await orderService.getOrders({
    status: status as OrderStatus | undefined,
    artisanId: artisanId as string | undefined,
    clientId: clientId as string | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.json(result);
};

export const handleGetOrder = async (req: AuthenticatedRequest, res: Response) => {
  const order = await orderService.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json(order);
};

export const handleAddPayment = async (req: AuthenticatedRequest, res: Response) => {
  const { amount, paymentMethod, referenceNotes } = req.body;
  if (!amount || !paymentMethod) {
    return res.status(400).json({ error: 'Monto y método de pago requeridos' });
  }

  const result = await orderService.addPayment({
    orderId: req.params.id,
    registeredById: req.user!.id,
    amount: Number(amount),
    paymentMethod,
    referenceNotes,
  });

  res.status(201).json(result);
};

export const handleUpdateStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { status, note, artisanId, newStatus } = req.body;
  const targetStatus = status || newStatus;
  if (!targetStatus) return res.status(400).json({ error: 'El estado es obligatorio' });

  await orderService.updateOrderStatus({
    orderId: req.params.id,
    userId: req.user!.id,
    newStatus: targetStatus,
    note,
    artisanId,
  });

  res.json({ message: `Estado actualizado a ${targetStatus}` });
};

export const handleGetOrderMaterials = async (req: AuthenticatedRequest, res: Response) => {
  const materials = await orderService.getOrderMaterials(req.params.id);
  res.json(materials);
};

export const handleCancelOrder = async (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  const { id: orderId } = req.params;

  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({ error: 'El motivo de cancelación es obligatorio' });
  }

  await orderService.cancelOrder({
    orderId,
    userId: req.user!.id,
    reason,
  });

  res.json({ message: 'Pedido cancelado correctamente y registrado en historial' });
};

export const handleRegisterMetalReturn = async (req: AuthenticatedRequest, res: Response) => {
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

  const result = await registerMetalReturn({
    orderId,
    materialId,
    artisanId: req.user!.id,
    finalPieceWeight: Number(finalPieceWeight),
    scrapWeight: Number(scrapWeight),
    notes,
    ipAddress: req.ip,
  });

  res.status(200).json({
    message: 'Liquidación de metal y merma procesada exitosamente',
    ...result,
  });
};

export const handleAssignArtisan = async (req: AuthenticatedRequest, res: Response) => {
  const { artisanId } = req.body;
  if (!artisanId) return res.status(400).json({ error: 'ID de joyero requerido' });

  const order = await orderService.assignArtisan(req.params.id, artisanId, req.user!.id);
  res.json({ message: 'Joyero asignado correctamente', order });
};
