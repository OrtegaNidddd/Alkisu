/** Única fuente del cálculo de saldo. Acepta Decimal de Prisma, texto o número. */
export const calcularSaldo = (pedido) => {
    const totalPactado = Number(pedido.totalPactado);
    const totalAbonado = pedido.payments.reduce((acc, pago) => acc + Number(pago.amount), 0);
    return { totalPactado, totalAbonado, saldoPendiente: totalPactado - totalAbonado };
};
