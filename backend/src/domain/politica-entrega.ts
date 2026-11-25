import { OrderStatus } from '@prisma/client';

export interface ContextoEntrega {
  status: OrderStatus;
  saldoPendiente: number;
}

export interface ResultadoValidacion {
  esValido: boolean;
  motivoRechazo?: string;
}

/** Estrategia que decide si un pedido puede entregarse al cliente. */
export interface IPoliticaEntregaStrategy {
  validarEntrega(contexto: ContextoEntrega): ResultadoValidacion;
}

/** Política vigente del taller: pieza en calidad y pago total. */
export class PoliticaContadoEstrictoStrategy implements IPoliticaEntregaStrategy {
  validarEntrega({ status, saldoPendiente }: ContextoEntrega): ResultadoValidacion {
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
