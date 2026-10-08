import { Router } from 'express';
import { handleGetDashboardMetrics } from '../controllers/dashboard.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { Role } from '@prisma/client';
const router = Router();
router.use(authenticateToken);
// Acceso para Administrador y Asesor
router.get('/stats', authorizeRoles(Role.ADMIN, Role.ASESOR), handleGetDashboardMetrics);
export default router;
