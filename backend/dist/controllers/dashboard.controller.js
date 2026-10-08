import * as dashboardService from '../services/dashboard.service.js';
export const handleGetDashboardMetrics = async (_req, res) => {
    try {
        const stats = await dashboardService.getDashboardMetrics();
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al consolidar métricas del dashboard' });
    }
};
