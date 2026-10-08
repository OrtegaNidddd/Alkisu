import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';

export const validate =
  (schema: ZodTypeAny) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      next(error); // Se delega directamente a errorHandler
    }
  };