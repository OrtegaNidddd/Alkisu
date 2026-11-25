import prisma from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { construirItems } from '../domain/items-cotizacion.js';
import { QuoteStatus, OrderStatus } from '@prisma/client';
export const createQuote = async (data) => {
    return await prisma.quote.create({
        data: {
            clientId: data.clientId,
            createdById: data.createdById,
            validUntil: data.validUntil,
            status: QuoteStatus.BORRADOR,
            ...construirItems(data.items),
        },
        include: { items: true, client: true },
    });
};
export const getQuotes = async () => {
    return await prisma.quote.findMany({
        include: {
            client: { select: { id: true, fullName: true, phone: true } },
            createdBy: { select: { id: true, fullName: true } },
            order: { select: { id: true, status: true } },
            items: true,
        },
        orderBy: { createdAt: 'desc' },
    });
};
export const getQuoteById = async (id) => {
    return await prisma.quote.findUnique({
        where: { id },
        include: {
            client: true,
            createdBy: { select: { id: true, fullName: true } },
            items: true,
            order: true,
        },
    });
};
export const approveQuoteAndConvertToOrder = async (quoteId, userId) => {
    const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: { items: true },
    });
    if (!quote)
        throw new AppError('Cotización no encontrada');
    if (quote.status === QuoteStatus.APROBADA)
        throw new AppError('Esta cotización ya fue aprobada');
    return await prisma.$transaction(async (tx) => {
        await tx.quote.update({
            where: { id: quoteId },
            data: { status: QuoteStatus.APROBADA },
        });
        const description = quote.items
            .map((item) => `${item.quantity}x ${item.description}`)
            .join(' | ');
        const order = await tx.order.create({
            data: {
                quoteId: quote.id,
                clientId: quote.clientId,
                createdById: userId,
                description: `Fabricación según cotización: ${description}`,
                totalPactado: quote.totalAmount,
                status: OrderStatus.CREADO,
                statusHistory: {
                    create: {
                        userId,
                        fromStatus: OrderStatus.CREADO,
                        toStatus: OrderStatus.CREADO,
                        note: `Pedido originado de la cotización aprobada`,
                    },
                },
            },
            include: {
                client: true,
            },
        });
        return order;
    });
};
export const updateQuote = async (id, data) => {
    const existing = await prisma.quote.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!existing)
        throw new AppError('Cotización no encontrada');
    if (existing.status === QuoteStatus.APROBADA) {
        throw new AppError('No se puede modificar una cotización ya aprobada');
    }
    return await prisma.$transaction(async (tx) => {
        if (data.items) {
            await tx.quoteItem.deleteMany({ where: { quoteId: id } });
            return await tx.quote.update({
                where: { id },
                data: {
                    clientId: data.clientId || existing.clientId,
                    validUntil: data.validUntil,
                    ...construirItems(data.items),
                },
                include: { items: true, client: true },
            });
        }
        return await tx.quote.update({
            where: { id },
            data: {
                clientId: data.clientId,
                validUntil: data.validUntil,
            },
            include: { items: true, client: true },
        });
    });
};
export const deleteQuote = async (id) => {
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote)
        throw new AppError('Cotización no encontrada');
    if (quote.status === QuoteStatus.APROBADA) {
        throw new AppError('No se puede eliminar una cotización aprobada');
    }
    return await prisma.quote.delete({ where: { id } });
};
