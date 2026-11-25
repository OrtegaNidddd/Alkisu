import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as auditService from '../services/audit.service.js';

export const handleGetAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  const { action, userId, page, limit } = req.query;

  const result = await auditService.getAuditLogs({
    action: action as string | undefined,
    userId: userId as string | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.json(result);
};
