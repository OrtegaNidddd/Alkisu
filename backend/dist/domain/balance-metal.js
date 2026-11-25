import { AppError } from '../lib/errors.js';
/** Merma máxima normal en taller, en porcentaje. */
export const UMBRAL_MERMA_INUSUAL = 8;
export const calcularBalanceMetal = (entregado, pesoJoya, limalla, unidad) => {
    const devuelto = pesoJoya + limalla;
    if (devuelto > entregado) {
        throw new AppError(`El peso total devuelto (${devuelto} ${unidad}) excede el material entregado (${entregado} ${unidad})`);
    }
    const merma = Number((entregado - devuelto).toFixed(3));
    const porcentajeMerma = Number(((merma / entregado) * 100).toFixed(2));
    return { merma, porcentajeMerma, mermaInusual: porcentajeMerma > UMBRAL_MERMA_INUSUAL };
};
