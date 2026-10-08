import { Router } from 'express';
import { handleCreateQuote, handleGetQuotes, handleGetQuoteById, handleApproveQuote, } from '../controllers/quote.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { Role } from '@prisma/client';
const router = Router();
router.use(authenticateToken);
// Listar y ver detalles
router.get('/', handleGetQuotes);
router.get('/:id', handleGetQuoteById);
// Crear y aprobar: Administrador y Asesor
router.post('/', authorizeRoles(Role.ADMIN, Role.ASESOR), handleCreateQuote);
router.post('/:id/approve', authorizeRoles(Role.ADMIN, Role.ASESOR), handleApproveQuote);
export default router;
