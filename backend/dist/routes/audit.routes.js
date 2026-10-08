import { Router } from 'express';
import { handleGetAuditLogs } from '../controllers/audit.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { Role } from '@prisma/client';
const router = Router();
router.use(authenticateToken);
// Exclusivo para el Administrador
router.get('/', authorizeRoles(Role.ADMIN), handleGetAuditLogs);
export default router;
