interface PedidoConPagos {
  totalPactado: unknown;
  payments: { amount: unknown }[];
}

export interface Saldo {
  totalPactado: number;
  totalAbonado: number;
  saldoPendiente: number;
}

/** Única fuente del cálculo de saldo. Acepta Decimal de Prisma, texto o número. */
export const calcularSaldo = (pedido: PedidoConPagos): Saldo => {
  const totalPactado = Number(pedido.totalPactado);
  const totalAbonado = pedido.payments.reduce((acc, pago) => acc + Number(pago.amount), 0);
  return { totalPactado, totalAbonado, saldoPendiente: totalPactado - totalAbonado };
};
