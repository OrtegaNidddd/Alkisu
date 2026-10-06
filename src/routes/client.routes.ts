import { Router } from 'express';
import { handleGetClients, handleCreateClient, handleUpdateClient, handleDeleteClient } from '../controllers/client.controller';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/', handleGetClients);
router.post('/', authorizeRoles(Role.ADMIN, Role.ASESOR), handleCreateClient);
router.put('/:id', handleUpdateClient);
router.delete('/:id', authorizeRoles(Role.ADMIN), handleDeleteClient);

export default router;