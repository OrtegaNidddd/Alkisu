import * as dashboardService from '../services/dashboard.service.js';
export const handleGetDashboardMetrics = async (_req, res) => {
    const stats = await dashboardService.getDashboardMetrics();
    res.json(stats);
};
