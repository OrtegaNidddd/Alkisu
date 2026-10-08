import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
export class AppError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export const errorHandler = (err, _req, res, _next) => {
    // 1. Errores de validación de Zod
    if (err instanceof ZodError) {
        const formattedErrors = err.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
        }));
        return res.status(400).json({
            error: 'Error de validación en la petición',
            details: formattedErrors,
        });
    }
    // 2. Errores de negocio controlados (AppError)
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
        });
    }
    // 3. Errores conocidos de Prisma ORM
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            const target = err.meta?.target?.join(', ') || 'campo único';
            return res.status(409).json({
                error: `Conflicto de unicidad: ya existe un registro con ese ${target}`,
            });
        }
        if (err.code === 'P2025') {
            return res.status(404).json({
                error: 'El registro solicitado no fue encontrado en la base de datos',
            });
        }
    }
    // 4. Errores generales / no controlados (500)
    console.error('[Error no controlado]:', err);
    return res.status(500).json({
        error: 'Ocurrió un error interno en el servidor',
        message: err?.message || String(err),
    });
};
