import prisma from '../lib/prisma.js';
import { OrderStatus } from '@prisma/client';
export const getDashboardMetrics = async () => {
    const [orders, lowStockMaterials, pendingQuotesCount] = await Promise.all([
        // Consultar todos los pedidos vigentes (no cancelados) con sus pagos
        prisma.order.findMany({
            where: {
                status: { not: OrderStatus.CANCELADO },
            },
            select: {
                id: true,
                status: true,
                totalPactado: true,
                estimatedDelivery: true,
                payments: {
                    select: { amount: true },
                },
            },
        }),
        // Materiales con inventario en o por debajo del umbral mínimo
        prisma.material.findMany({
            where: {
                stock: { lte: prisma.material.fields.minStock },
            },
            select: {
                id: true,
                name: true,
                stock: true,
                minStock: true,
                unit: true,
            },
        }),
        // Cotizaciones esperando respuesta del cliente
        prisma.quote.count({
            where: { status: 'BORRADOR' },
        }),
    ]);
    // Cálculos financieros y operativos
    let totalFacturado = 0;
    let totalRecaudado = 0;
    let carteraPendiente = 0;
    let pedidosEnFabricacion = 0;
    let pedidosPorEntregar = 0;
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    let proximasEntregas = 0;
    orders.forEach((order) => {
        const pactado = Number(order.totalPactado);
        const abonado = order.payments.reduce((acc, p) => acc + Number(p.amount), 0);
        const saldo = pactado - abonado;
        totalFacturado += pactado;
        totalRecaudado += abonado;
        if (order.status !== OrderStatus.ENTREGADO) {
            carteraPendiente += saldo;
            if (order.status === OrderStatus.FABRICACION) {
                pedidosEnFabricacion++;
            }
            if (order.status === OrderStatus.CALIDAD) {
                pedidosPorEntregar++;
            }
            if (order.estimatedDelivery && order.estimatedDelivery <= nextWeek) {
                proximasEntregas++;
            }
        }
    });
    return {
        financiero: {
            totalFacturado,
            totalRecaudado,
            carteraPendiente,
        },
        taller: {
            pedidosActivos: orders.filter((o) => o.status !== OrderStatus.ENTREGADO).length,
            enFabricacion: pedidosEnFabricacion,
            enControlCalidad: pedidosPorEntregar,
            entregasProximos7Dias: proximasEntregas,
        },
        inventario: {
            materialesCriticosCount: lowStockMaterials.length,
            alertasStock: lowStockMaterials.map((m) => ({
                id: m.id,
                nombre: m.name,
                stockActual: Number(m.stock),
                stockMinimo: Number(m.minStock),
                unidad: m.unit,
            })),
        },
        comercial: {
            cotizacionesPendientes: pendingQuotesCount,
        },
    };
};
