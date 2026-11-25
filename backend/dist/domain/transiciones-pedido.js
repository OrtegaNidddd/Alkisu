import { OrderStatus } from '@prisma/client';
import { AppError } from '../lib/errors.js';
// CANCELADO no aparece como destino: se cancela por su propia ruta, que exige motivo y rol.
// ENTREGADO lo decide la política de entrega (ver politica-entrega.ts).
const TRANSICIONES = new Map([
    [OrderStatus.CREADO, [OrderStatus.FABRICACION]],
    [OrderStatus.FABRICACION, [OrderStatus.CALIDAD]],
    [OrderStatus.CALIDAD, [OrderStatus.FABRICACION]], // reproceso
]);
export const validarTransicion = (desde, hacia) => {
    if (!TRANSICIONES.get(desde)?.includes(hacia)) {
        throw new AppError(`Transición no permitida: de ${desde} a ${hacia}`);
    }
};
