import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as dashboardService from '../services/dashboard.service.js';

export const handleGetDashboardMetrics = async (_req: AuthenticatedRequest, res: Response) => {
  const stats = await dashboardService.getDashboardMetrics();
  res.json(stats);
};
