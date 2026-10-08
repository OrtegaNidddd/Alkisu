import prisma from '../lib/prisma.js';
export const createClient = async (data) => {
    return await prisma.client.create({ data });
};
// Listado con soporte para búsqueda rápida
export const getClients = async (search) => {
    const whereClause = search
        ? {
            OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { documentId: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
            ],
        }
        : undefined;
    return await prisma.client.findMany({
        where: whereClause,
        include: {
            _count: {
                select: {
                    orders: true,
                    quotes: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};
// Ficha de cliente con historial completo de compras y cotizaciones
export const getClientById = async (id) => {
    const client = await prisma.client.findUnique({
        where: { id },
        include: {
            orders: {
                orderBy: { createdAt: 'desc' },
                include: {
                    artisan: { select: { fullName: true } },
                    payments: { select: { amount: true } },
                },
            },
            quotes: {
                orderBy: { createdAt: 'desc' },
                include: {
                    items: true,
                },
            },
        },
    });
    if (!client)
        return null;
    // Resumen financiero acumulado del cliente
    const totalFacturado = client.orders.reduce((acc, order) => acc + Number(order.totalPactado), 0);
    return {
        ...client,
        stats: {
            totalOrders: client.orders.length,
            totalQuotes: client.quotes.length,
            totalFacturado,
        },
    };
};
export const updateClient = async (id, data) => {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client)
        throw new Error('Cliente no encontrado');
    return await prisma.client.update({
        where: { id },
        data,
    });
};
