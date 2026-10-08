import { Router } from 'express';
import { handleGetUsers, handleGetUserById, handleUpdateUser, } from '../controllers/user.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { Role } from '@prisma/client';
const router = Router();
router.use(authenticateToken);
// Consulta de personal (Admin y Asesor)
router.get('/', authorizeRoles(Role.ADMIN, Role.ASESOR), handleGetUsers);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.ASESOR), handleGetUserById);
// Edición de rol o datos de operarios (Solo Admin)
router.patch('/:id', authorizeRoles(Role.ADMIN), handleUpdateUser);
export default router;
