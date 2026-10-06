import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as dashboardService from '../services/dashboard.service.js';

export const handleGetDashboardMetrics = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await dashboardService.getDashboardMetrics();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consolidar métricas del dashboard' });
  }
};