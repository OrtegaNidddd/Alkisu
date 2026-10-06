import { Router } from 'express';
import {
  handleCreateOrder,
  handleGetOrders,
  handleGetOrderById,
  handleUpdateStatus,
  handleAddPayment,
  handleCancelOrder,
  handleRegisterMetalReturn,
} from '../controllers/order.controller.js';
import { handleConsumeMaterial } from '../controllers/material.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createOrderSchema,
  metalReturnSchema,
  addPaymentSchema,
} from '../schemas/order.schemas.js';
import { Role } from '@prisma/client';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Creación, cobros y cancelación: Administrador y Asesor
router.post(
  '/',
  authorizeRoles(Role.ADMIN, Role.ASESOR),
  validate(createOrderSchema),
  handleCreateOrder
);
router.post(
  '/:id/payments',
  authorizeRoles(Role.ADMIN, Role.ASESOR),
  validate(addPaymentSchema),
  handleAddPayment
);
router.patch('/:id/cancel', authorizeRoles(Role.ADMIN, Role.ASESOR), handleCancelOrder);

// Consulta de pedidos: todos los roles
router.get('/', handleGetOrders);
router.get('/:id', handleGetOrderById);

// Registro de consumo de material: Joyero y Administrador
router.post(
  '/:id/consume-material',
  authorizeRoles(Role.ADMIN, Role.JOYERO),
  handleConsumeMaterial
);

// Liquidación de metales (devolución y mermas): Joyero y Administrador
router.post(
  '/:id/metal-return',
  authorizeRoles(Role.ADMIN, Role.JOYERO),
  validate(metalReturnSchema),
  handleRegisterMetalReturn
);

// Avance de estados: Joyero (fabricación/calidad), Asesor y Admin
router.patch('/:id/status', handleUpdateStatus);

export default router;