import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as orderService from '../services/order.service.js';

export const handleCreateOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
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
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al crear pedido' });
  }
};

export const handleGetOrders = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await orderService.getOrders();
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar pedidos' });
  }
};

export const handleGetOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar pedido' });
  }
};

export const handleAddPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
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
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const handleUpdateStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, note, artisanId } = req.body;
    if (!status) return res.status(400).json({ error: 'El estado es obligatorio' });

    await orderService.updateOrderStatus({
      orderId: req.params.id,
      userId: req.user!.id,
      newStatus: status,
      note,
      artisanId,
    });

    res.json({ message: `Estado actualizado a ${status}` });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const handleGetOrderMaterials = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const materials = await orderService.getOrderMaterials(req.params.id);
    res.json(materials);
  } catch (error: any) {
    const status = error.message === 'Pedido no encontrado' ? 404 : 500;
    res.status(status).json({ error: error.message || 'Error al consultar materiales del pedido' });
  }
};