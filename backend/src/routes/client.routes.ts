import { Router } from 'express';
import {
  handleGetClients,
  handleGetClientById,
  handleCreateClient,
  handleUpdateClient,
} from '../controllers/client.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Todas las operaciones de clientes requieren inicio de sesión
router.use(authenticateToken);

// Búsqueda y listado (todos los roles)
router.get('/', handleGetClients);
router.get('/:id', handleGetClientById);

// Registro y actualización de datos (Admin y Asesor)
router.post('/', authorizeRoles(Role.ADMIN, Role.ASESOR), handleCreateClient);
router.patch('/:id', authorizeRoles(Role.ADMIN, Role.ASESOR), handleUpdateClient);

export default router;