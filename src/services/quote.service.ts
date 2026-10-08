import prisma from '../lib/prisma.js';
import { QuoteStatus, OrderStatus } from '@prisma/client';

export const createQuote = async (data: {
  clientId: string;
  createdById: string;
  validUntil?: Date;
  items: { description: string; quantity: number; unitPrice: number }[];
}) => {
  const totalAmount = data.items.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0
  );

  return await prisma.quote.create({
    data: {
      clientId: data.clientId,
      createdById: data.createdById,
      totalAmount,
      validUntil: data.validUntil,
      status: QuoteStatus.BORRADOR,
      items: {
        create: data.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        })),
      },
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

export const getQuoteById = async (id: string) => {
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

export const approveQuoteAndConvertToOrder = async (quoteId: string, userId: string) => {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: true },
  });

  if (!quote) throw new Error('Cotización no encontrada');
  if (quote.status === QuoteStatus.APROBADA) throw new Error('Esta cotización ya fue aprobada');

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