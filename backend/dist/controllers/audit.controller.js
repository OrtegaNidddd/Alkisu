import * as auditService from '../services/audit.service.js';
export const handleGetAuditLogs = async (req, res) => {
    const { action, userId, page, limit } = req.query;
    const result = await auditService.getAuditLogs({
        action: action,
        userId: userId,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
};
