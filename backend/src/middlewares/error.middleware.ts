import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { AppError } from '../lib/errors.js';

interface RespuestaError {
  status: number;
  body: { error: string; details?: unknown };
}

const respuesta = (status: number, error: string): RespuestaError => ({ status, body: { error } });

const desdeZod = (err: ZodError): RespuestaError => ({
  status: 400,
  body: {
    error: 'Error de validación en la petición',
    details: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
  },
});

const desdePrisma = (err: Prisma.PrismaClientKnownRequestError): RespuestaError | null => {
  const target = (err.meta?.target as string[] | undefined)?.join(', ') || 'campo único';
  switch (err.code) {
    case 'P2002':
      return respuesta(409, `Conflicto de unicidad: ya existe un registro con ese ${target}`);
    case 'P2003':
      return respuesta(400, 'La petición hace referencia a un registro que no existe');
    case 'P2025':
      return respuesta(404, 'El registro solicitado no fue encontrado en la base de datos');
    default:
      return null;
  }
};

const traducir = (err: unknown): RespuestaError | null => {
  if (err instanceof ZodError) return desdeZod(err);
  if (err instanceof AppError) return respuesta(err.statusCode, err.message);
  if (err instanceof multer.MulterError) return respuesta(400, err.message);
  if (err instanceof Prisma.PrismaClientKnownRequestError) return desdePrisma(err);
  if (err instanceof Prisma.PrismaClientValidationError) {
    return respuesta(400, 'Los datos enviados no son válidos');
  }
  return null;
};

// Express reconoce el manejador de errores por sus cuatro parámetros.
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const traducido = traducir(err);
  if (traducido) return res.status(traducido.status).json(traducido.body);

  // El detalle queda solo en el log del servidor.
  console.error('[Error no controlado]:', err);
  return res.status(500).json({ error: 'Ocurrió un error interno en el servidor' });
};
