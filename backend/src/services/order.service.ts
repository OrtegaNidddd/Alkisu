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



// 6. Obtener lista de materiales consumidos en un pedido
export const getOrderMaterials = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });

  if (!order) throw new Error('Pedido no encontrado');

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
  const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 50);
  const skip = (page - 1) * limit;

  const whereClause: any = {};

  if (filters.status) whereClause.status = filters.status;
  if (filters.artisanId) whereClause.artisanId = filters.artisanId;
  if (filters.clientId) whereClause.clientId = filters.clientId;

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
        _count: { select: { materialsUsed: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Formatear cada orden con su resumen financiero básico
  const items = orders.map((order) => {
    const totalAbonado = order.payments.reduce(
      (acc, curr) => acc + Number(curr.amount),
      0
    );
    const balance = Number(order.totalPactado) - totalAbonado;

    return {
      id: order.id,
      description: order.description,
      status: order.status,
      clientId: order.clientId,
      client: order.client,
      artisanId: order.artisanId,
      artisan: order.artisan,
      totalPactado: Number(order.totalPactado),
      totalAbonado,
      saldoPendiente: balance,
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

  if (!order) throw new Error('Pedido no encontrado');

  if (order.status === OrderStatus.ENTREGADO) {
    throw new Error('No se puede cancelar una joya que ya fue entregada al cliente');
  }

  if (order.status === OrderStatus.CANCELADO) {
    throw new Error('El pedido ya se encuentra cancelado');
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

export const registerMetalReturn = async (data: {
  orderId: string;
  materialId: string;
  artisanId: string;
  finalPieceWeight: number; // Peso de la joya terminada en gramos
  scrapWeight: number;      // Limalla/retazos recuperados para bodega
  notes?: string;
  ipAddress?: string;
}) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Verificar la orden y sus consumos de este material
    const order = await tx.order.findUnique({
      where: { id: data.orderId },
      include: {
        materialsUsed: {
          where: { materialId: data.materialId },
        },
      },
    });

    if (!order) throw new Error('Pedido no encontrado');

    const totalEntregado = order.materialsUsed.reduce(
      (acc, item) => acc + Number(item.quantity),
      0
    );

    if (totalEntregado <= 0) {
      throw new Error('Este pedido no tiene registros de consumo del material especificado');
    }

    const material = await tx.material.findUnique({
      where: { id: data.materialId },
    });

    if (!material) throw new Error('Material no encontrado');

    // 2. Cálculo del balance y la merma técnica
    const pesoDevueltoTotal = data.finalPieceWeight + data.scrapWeight;

    if (pesoDevueltoTotal > totalEntregado) {
      throw new Error(
        `El peso total devuelto (${pesoDevueltoTotal} ${material.unit}) excede el material entregado (${totalEntregado} ${material.unit})`
      );
    }

    const merma = Number((totalEntregado - pesoDevueltoTotal).toFixed(3));
    const porcentajeMerma = Number(((merma / totalEntregado) * 100).toFixed(2));
    const mermaInusual = porcentajeMerma > 8.0; // Umbral de alerta estándar en taller (> 8%)

    // 3. Reintegrar la limalla/retazos recuperados al inventario de bodega
    let updatedMaterial = material;
    if (data.scrapWeight > 0) {
      updatedMaterial = await tx.material.update({
        where: { id: data.materialId },
        data: {
          stock: {
            increment: data.scrapWeight,
          },
        },
      });
    }

    // 4. Registro inmutable en AuditLog de la liquidación de mesa
    const audit = await tx.auditLog.create({
      data: {
        userId: data.artisanId,
        action: 'LIQUIDACION_METAL_MERMA',
        tableName: 'Order',
        recordId: data.orderId,
        ipAddress: data.ipAddress,
        details: {
          materialName: material.name,
          unidad: material.unit,
          metalEntregado: totalEntregado,
          pesoJoyaFinal: data.finalPieceWeight,
          limallaRetornada: data.scrapWeight,
          mermaTecnica: merma,
          porcentajeMerma: `${porcentajeMerma}%`,
          alertaMermaInusual: mermaInusual,
          observaciones: data.notes || 'Liquidación estándar de taller',
        },
      },
    });

    // 5. Dejar constancia en el historial de estados del pedido
    await tx.orderStatusHistory.create({
      data: {
        orderId: data.orderId,
        userId: data.artisanId,
        fromStatus: order.status,
        toStatus: order.status,
        note: `Balance de metal cerrado: Joya ${data.finalPieceWeight}g, Limalla ${data.scrapWeight}g, Merma ${merma}g (${porcentajeMerma}%).`,
      },
    });

    return {
      balance: {
        metalEntregado: totalEntregado,
        pesoJoyaFinal: data.finalPieceWeight,
        limallaRetornada: data.scrapWeight,
        mermaTecnica: merma,
        porcentajeMerma: `${porcentajeMerma}%`,
        mermaInusual,
      },
      nuevoStockMaterial: Number(updatedMaterial.stock),
      unidad: material.unit,
      auditId: audit.id,
    };
  });
};