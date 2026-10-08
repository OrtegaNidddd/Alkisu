import { Router } from 'express';
import { handleGetAuditLogs } from '../controllers/audit.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { Role } from '@prisma/client';
const router = Router();
router.use(authenticateToken);
// Consulta de auditoría y trazabilidad
router.get('/', authorizeRoles(Role.ADMIN, Role.ASESOR, Role.JOYERO), handleGetAuditLogs);
export default router;
