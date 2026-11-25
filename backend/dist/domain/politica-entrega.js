import { OrderStatus } from '@prisma/client';
/** Política vigente del taller: pieza en calidad y pago total. */
export class PoliticaContadoEstrictoStrategy {
    validarEntrega({ status, saldoPendiente }) {
        if (status !== OrderStatus.CALIDAD) {
            return {
                esValido: false,
                motivoRechazo: `Entrega rechazada: el pedido debe estar en CALIDAD y está en ${status}`,
            };
        }
        if (saldoPendiente > 0) {
            return {
                esValido: false,
                motivoRechazo: `Entrega rechazada: el pedido tiene un saldo pendiente de $${saldoPendiente}`,
            };
        }
        return { esValido: true };
    }
}
