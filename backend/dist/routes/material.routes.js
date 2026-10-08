import { Router } from 'express';
import { handleCreateMaterial, handleGetMaterials, handleRestockMaterial, handleUpdateMaterial, } from '../controllers/material.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { Role } from '@prisma/client';
const router = Router();
router.use(authenticateToken);
// Consultar stock (Admin, Asesor, Joyero)
router.get('/', handleGetMaterials);
// Dar de alta o ingresar stock inicial (Solo Administrador)
router.post('/', authorizeRoles(Role.ADMIN), handleCreateMaterial);
// Editar / Actualizar material existente (Solo Administrador)
router.put('/:id', authorizeRoles(Role.ADMIN), handleUpdateMaterial);
// Reabastecer material (Solo Administrador)
router.patch('/:id/restock', authorizeRoles(Role.ADMIN), handleRestockMaterial);
export default router;
