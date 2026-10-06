import { Router } from 'express';
import {
  handleCreateOrder,
  handleGetOrders,
  handleGetOrder,
  handleAddPayment,
  handleUpdateStatus,
  handleGetOrderMaterials,
} from '../controllers/order.controller.js';
import { handleConsumeMaterial } from '../controllers/material.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Todas las rutas requieren sesión activa
router.use(authenticateToken);

// Creación y cobros: Administrador y Asesor
router.post('/', authorizeRoles(Role.ADMIN, Role.ASESOR), handleCreateOrder);
router.post('/:id/payments', authorizeRoles(Role.ADMIN, Role.ASESOR), handleAddPayment);

// Consulta de pedidos: todos los roles
router.get('/', handleGetOrders);
router.get('/:id', handleGetOrder);

// Materiales utilizados en el pedido
router.get('/:id/materials', handleGetOrderMaterials);
router.post(
  '/:id/materials',
  authorizeRoles(Role.ADMIN, Role.JOYERO),
  handleConsumeMaterial
);

// Avance de estados: Joyero (fabricación/calidad), Asesor y Admin
router.patch('/:id/status', handleUpdateStatus);

export default router;