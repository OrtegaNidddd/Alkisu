import { Prisma } from '@prisma/client';

/** Error de negocio: su mensaje sí puede mostrarse al usuario. */
export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const pedidoNoEncontrado = (statusCode = 400) =>
  new AppError('Pedido no encontrado', statusCode);

/** Para usar en .catch(): convierte una violación de unicidad en un error de negocio. */
export const siDuplicado = (mensaje: string) => (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(mensaje);
  }
  throw error;
};
