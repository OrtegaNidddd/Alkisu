import prisma from '../lib/prisma.js';
import { AppError, pedidoNoEncontrado } from '../lib/errors.js';
import { calcularSaldo } from '../domain/saldo.js';
import { validarTransicion } from '../domain/transiciones-pedido.js';
import {
  IPoliticaEntregaStrategy,
  PoliticaContadoEstrictoStrategy,
} from '../domain/politica-entrega.js';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';

// 1. Crear pedido con precio pactado inmutable
export const createOrder = async (data: {
  clientId: string;
  createdById: string;
  artisanId?: string;
  description: string;
  totalPactado: number;
  estimatedDelivery?: Date;
}) => {
  return await prisma.order.create({
    data: {
      clientId: data.clientId,
      createdById: data.createdById,
      artisanId: data.artisanId,
      description: data.description,
      totalPactado: data.totalPactado,
      estimatedDelivery: data.estimatedDelivery,
      statusHistory: {
        create: {
          userId: data.createdById,
          fromStatus: OrderStatus.CREADO,
          toStatus: OrderStatus.CREADO,
          note: 'Pedido registrado en el sistema',
        },
      },
    },
    include: {
      client: true,
      artisan: { select: { id: true, fullName: true } },
    },
  });
};

// 2. Registrar abono y calcular saldo restante
export const addPayment = async (data: {
  orderId: string;
  registeredById: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNotes?: string;
}) => {
  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    include: { payments: true },
  });

  if (!order) throw pedidoNoEncontrado();

  const { saldoPendiente: saldoActual } = calcularSaldo(order);

  if (data.amount > saldoActual) {
    throw new AppError(`El abono ($${data.amount}) excede el saldo pendiente ($${saldoActual})`);
  }

  const payment = await prisma.payment.create({
    data: {
      orderId: data.orderId,
      registeredById: data.registeredById,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      referenceNotes: data.referenceNotes,
    },
  });

  const nuevoSaldo = saldoActual - data.amount;

  return { payment, nuevoSaldo };
};

// 3. Obtener detalle de pedido con saldo calculado
export const getOrderById = async (id: string) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      client: true,
      artisan: { select: { id: true, fullName: true } },
      payments: {
        include: { registeredBy: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
      },
      statusHistory: {
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
      },
      materialsUsed: { include: { material: true } },
      attachments: { orderBy: { createdAt: 'desc' } },
      quote: { include: { items: true } },
    },
  });

  if (!order) return null;

  const saldo = calcularSaldo(order);

  return {
    ...order,
    ...saldo,
    payments: order.payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      createdAt: p.createdAt.toISOString(),
    })),
    statusHistory: order.statusHistory.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    })),
    materialsUsed: order.materialsUsed.map((m) => ({
      ...m,
      quantity: Number(m.quantity),
    })),
    financialSummary: {
      ...saldo,
      estaLiquidado: saldo.saldoPendiente <= 0,
    },
  };
};

// Política vigente; cambiarla no exige modificar updateOrderStatus
const politicaEntrega: IPoliticaEntregaStrategy = new PoliticaContadoEstrictoStrategy();

// 4. Transición de estados con validación de secuencia y de entrega
export const updateOrderStatus = async (data: {
  orderId: string;
  userId: string;
  newStatus: OrderStatus;
  note?: string;
  artisanId?: string;
}) => {
  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    include: { payments: true },
  });

  if (!order) throw pedidoNoEncontrado();

  // Determinar quién será el joyero (el actual o el nuevo que se asigne)
  const currentArtisanId = data.artisanId || order.artisanId;

  // REGLA 1: Para entrar a FABRICACIÓN debe haber un joyero asignado
  if (data.newStatus === OrderStatus.FABRICACION && !currentArtisanId) {
    throw new AppError('No se puede pasar a FABRICACIÓN: el pedido no tiene un joyero asignado.');
  }

  // REGLA 2: la política de entrega decide si la pieza puede salir del taller
  if (data.newStatus === OrderStatus.ENTREGADO) {
    const { esValido, motivoRechazo } = politicaEntrega.validarEntrega({
      status: order.status,
      saldoPendiente: calcularSaldo(order).saldoPendiente,
    });
    if (!esValido) throw new AppError(motivoRechazo ?? 'Entrega rechazada');
  } else {
    validarTransicion(order.status, data.newStatus);
  }

  return await prisma.$transaction([
    prisma.order.update({
      where: { id: data.orderId },
      data: {
        status: data.newStatus,
        artisanId: currentArtisanId,
        deliveryDate: data.newStatus === OrderStatus.ENTREGADO ? new Date() : undefined,
      },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId: data.orderId,
        userId: data.userId,
        fromStatus: order.status,
        toStatus: data.newStatus,
        note: data.note,
      },
    }),
  ]);
};

// 5. Asignar o reasignar joyero a un pedido
export const assignArtisan = async (orderId: string, artisanId: string, userId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });
  if (!order) throw pedidoNoEncontrado();

  const artisan = await prisma.user.findUnique({
    where: { id: artisanId },
  });
  if (!artisan) throw new AppError('Joyero no encontrado');

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { artisanId },
      include: {
        client: true,
        artisan: { select: { id: true, fullName: true, email: true } },
        materialsUsed: { include: { material: true } },
        attachments: true,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        userId,
        fromStatus: order.status,
        toStatus: order.status,
        note: `Joyero asignado: ${artisan.fullName}`,
      },
    });

    return updated;
  });
};



// 6. Obtener lista de materiales consumidos en un pedido
export const getOrderMaterials = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });

  if (!order) throw pedidoNoEncontrado(404);

  return await prisma.orderMaterial.findMany({
    where: { orderId },
    include: {
      material: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export interface OrderFilterParams {
  status?: OrderStatus;
  artisanId?: string;
  clientId?: string;
  page?: number;
  limit?: number;
}

export const getOrders = async (filters: OrderFilterParams = {}) => {
  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 200);
  const skip = (page - 1) * limit;

  const whereClause: Prisma.OrderWhereInput = {
    ...(filters.status && { status: filters.status }),
    ...(filters.artisanId && { artisanId: filters.artisanId }),
    ...(filters.clientId && { clientId: filters.clientId }),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where: whereClause }),
    prisma.order.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        client: { select: { id: true, fullName: true, phone: true, documentId: true, email: true } },
        artisan: { select: { id: true, fullName: true } },
        payments: {
          include: { registeredBy: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        materialsUsed: { include: { material: true } },
        attachments: { orderBy: { createdAt: 'desc' } },
        quote: { include: { items: true } },
        _count: { select: { materialsUsed: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Formatear cada orden con su resumen financiero básico
  const items = orders.map((order) => {
    return {
      id: order.id,
      description: order.description,
      status: order.status,
      clientId: order.clientId,
      client: order.client,
      artisanId: order.artisanId,
      artisan: order.artisan,
      ...calcularSaldo(order),
      estimatedDelivery: order.estimatedDelivery,
      createdAt: order.createdAt,
      materialsCount: order._count.materialsUsed,
      materialsUsed: order.materialsUsed.map((m) => ({
        ...m,
        quantity: Number(m.quantity),
      })),
      payments: order.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
      statusHistory: order.statusHistory,
      attachments: order.attachments || [],
      quote: order.quote || null,
    };
  });

  return {
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data: items,
  };
};

export const cancelOrder = async (data: {
  orderId: string;
  userId: string;
  reason: string;
}) => {
  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
  });

  if (!order) throw pedidoNoEncontrado();

  if (order.status === OrderStatus.ENTREGADO) {
    throw new AppError('No se puede cancelar una joya que ya fue entregada al cliente');
  }

  if (order.status === OrderStatus.CANCELADO) {
    throw new AppError('El pedido ya se encuentra cancelado');
  }

  return await prisma.$transaction([
    prisma.order.update({
      where: { id: data.orderId },
      data: { status: OrderStatus.CANCELADO },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId: data.orderId,
        userId: data.userId,
        fromStatus: order.status,
        toStatus: OrderStatus.CANCELADO,
        note: `CANCELACIÓN: ${data.reason}`,
      },
    }),
  ]);
};
