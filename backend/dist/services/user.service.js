import prisma from '../lib/prisma.js';
export const getUsers = async (roleFilter) => {
    return await prisma.user.findMany({
        where: roleFilter ? { role: roleFilter } : undefined,
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            createdAt: true,
            _count: {
                select: {
                    assignedOrders: true, // Cantidad de joyas asignadas si es joyero
                    createdOrders: true, // Cantidad de pedidos tomados si es asesor
                },
            },
        },
        orderBy: { fullName: 'asc' },
    });
};
export const getUserById = async (id) => {
    return await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            createdAt: true,
            assignedOrders: {
                where: { status: { not: 'ENTREGADO' } },
                select: {
                    id: true,
                    description: true,
                    status: true,
                    estimatedDelivery: true,
                },
            },
        },
    });
};
export const updateUser = async (id, data) => {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user)
        throw new Error('Usuario no encontrado');
    return await prisma.user.update({
        where: { id },
        data,
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            createdAt: true,
        },
    });
};
