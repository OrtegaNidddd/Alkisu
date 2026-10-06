import prisma from '../lib/prisma.js';
import { OrderStatus, PaymentMethod } from '@prisma/client';

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

  if (!order) throw new Error('Pedido no encontrado');

  const totalAbonado = order.payments.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0
  );
  const saldoActual = Number(order.totalPactado) - totalAbonado;

  if (data.amount > saldoActual) {
    throw new Error(`El abono ($${data.amount}) excede el saldo pendiente ($${saldoActual})`);
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
      payments: { orderBy: { createdAt: 'desc' } },
      statusHistory: { orderBy: { createdAt: 'desc' } },
      materialsUsed: { include: { material: true } },
    },
  });

  if (!order) return null;

  const totalAbonado = order.payments.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0
  );
  const balance = Number(order.totalPactado) - totalAbonado;

  return {
    ...order,
    financialSummary: {
      totalPactado: Number(order.totalPactado),
      totalAbonado,
      saldoPendiente: balance,
      estaLiquidado: balance <= 0,
    },
  };
};

// 4. Transición de estados con validación de saldo para entrega
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

  if (!order) throw new Error('Pedido no encontrado');

  // Determinar quién será el joyero (el actual o el nuevo que se asigne)
  const currentArtisanId = data.artisanId || order.artisanId;

  // REGLA 1: Para entrar a FABRICACIÓN debe haber un joyero asignado
  if (data.newStatus === OrderStatus.FABRICACION && !currentArtisanId) {
    throw new Error('No se puede pasar a FABRICACIÓN: el pedido no tiene un joyero asignado.');
  }

  // REGLA 2: Bloqueo de entrega si hay saldo pendiente
  if (data.newStatus === OrderStatus.ENTREGADO) {
    const totalAbonado = order.payments.reduce(
      (acc, curr) => acc + Number(curr.amount),
      0
    );
    const balance = Number(order.totalPactado) - totalAbonado;

    if (balance > 0) {
      throw new Error(`Entrega rechazada: el pedido tiene un saldo pendiente de $${balance}`);
    }
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

// 5. Listar todos los pedidos con resumen financiero
export const getOrders = async () => {
  const orders = await prisma.order.findMany({
    include: {
      client: true,
      artisan: { select: { id: true, fullName: true } },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return orders.map((order) => {
    const totalAbonado = order.payments.reduce(
      (acc, curr) => acc + Number(curr.amount),
      0
    );
    const balance = Number(order.totalPactado) - totalAbonado;

    return {
      ...order,
      financialSummary: {
        totalPactado: Number(order.totalPactado),
        totalAbonado,
        saldoPendiente: balance,
        estaLiquidado: balance <= 0,
      },
    };
  });
};