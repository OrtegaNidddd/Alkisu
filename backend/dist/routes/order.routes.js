import { Router } from 'express';
import { handleCreateOrder, handleGetOrders, handleGetOrder, handleAddPayment, handleUpdateStatus, handleGetOrderMaterials, handleCancelOrder, handleRegisterMetalReturn, } from '../controllers/order.controller.js';
import { handleAddAttachment, handleGetAttachments, } from '../controllers/attachment.controller.js';
import { handleConsumeMaterial } from '../controllers/material.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createOrderSchema, metalReturnSchema, addPaymentSchema, } from '../schemas/order.schemas.js';
import { Role } from '@prisma/client';
const router = Router();
// Todas las rutas requieren sesión activa
router.use(authenticateToken);
// Creación, cobros y cancelación: Administrador y Asesor
router.post('/', authorizeRoles(Role.ADMIN, Role.ASESOR), validate(createOrderSchema), handleCreateOrder);
router.post('/:id/payments', authorizeRoles(Role.ADMIN, Role.ASESOR), validate(addPaymentSchema), handleAddPayment);
router.patch('/:id/cancel', authorizeRoles(Role.ADMIN, Role.ASESOR), handleCancelOrder);
// Consulta de pedidos: todos los roles
router.get('/', handleGetOrders);
router.get('/:id', handleGetOrder);
// Materiales utilizados y liquidación de metal/merma en el pedido
router.get('/:id/materials', handleGetOrderMaterials);
router.post('/:id/materials', authorizeRoles(Role.ADMIN, Role.JOYERO), handleConsumeMaterial);
router.post('/:id/metal-return', authorizeRoles(Role.ADMIN, Role.JOYERO), validate(metalReturnSchema), handleRegisterMetalReturn);
// Avance de estados: Joyero (fabricación/calidad), Asesor y Admin
router.patch('/:id/status', handleUpdateStatus);
// Adjuntos del pedido
router.post('/:id/attachments', authorizeRoles(Role.ADMIN, Role.ASESOR, Role.JOYERO), handleAddAttachment);
router.get('/:id/attachments', handleGetAttachments);
export default router;
