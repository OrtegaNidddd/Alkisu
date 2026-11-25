import { OrderStatus, Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { AppError, pedidoNoEncontrado } from '../lib/errors.js';
import { BalanceMetal, calcularBalanceMetal } from '../domain/balance-metal.js';

export interface DevolucionMetal {
  orderId: string;
  materialId: string;
  artisanId: string;
  finalPieceWeight: number; // Peso de la joya terminada en gramos
  scrapWeight: number; // Limalla/retazos recuperados para bodega
  notes?: string;
  ipAddress?: string;
}

type Tx = Prisma.TransactionClient;

const obtenerConsumo = async (tx: Tx, data: DevolucionMetal) => {
  const order = await tx.order.findUnique({
    where: { id: data.orderId },
    include: { materialsUsed: { where: { materialId: data.materialId } } },
  });
  if (!order) throw pedidoNoEncontrado();

  const entregado = order.materialsUsed.reduce((acc, item) => acc + Number(item.quantity), 0);
  if (entregado <= 0) {
    throw new AppError('Este pedido no tiene registros de consumo del material especificado');
  }

  const material = await tx.material.findUnique({ where: { id: data.materialId } });
  if (!material) throw new AppError('Material no encontrado');

  return { status: order.status, entregado, material };
};

const reintegrarLimalla = (tx: Tx, data: DevolucionMetal) =>
  tx.material.update({
    where: { id: data.materialId },
    data: { stock: { increment: data.scrapWeight } },
  });

const resumenBalance = (data: DevolucionMetal, entregado: number, balance: BalanceMetal) => ({
  metalEntregado: entregado,
  pesoJoyaFinal: data.finalPieceWeight,
  limallaRetornada: data.scrapWeight,
  mermaTecnica: balance.merma,
  porcentajeMerma: `${balance.porcentajeMerma}%`,
});

// Registro inmutable en AuditLog de la liquidación de mesa
const auditarLiquidacion = (
  tx: Tx,
  data: DevolucionMetal,
  material: { name: string; unit: string },
  resumen: ReturnType<typeof resumenBalance> & { alertaMermaInusual: boolean }
) =>
  tx.auditLog.create({
    data: {
      userId: data.artisanId,
      action: 'LIQUIDACION_METAL_MERMA',
      tableName: 'Order',
      recordId: data.orderId,
      ipAddress: data.ipAddress,
      details: {
        materialName: material.name,
        unidad: material.unit,
        ...resumen,
        observaciones: data.notes || 'Liquidación estándar de taller',
      },
    },
  });

const registrarEnHistorial = (tx: Tx, data: DevolucionMetal, status: OrderStatus, balance: BalanceMetal) =>
  tx.orderStatusHistory.create({
    data: {
      orderId: data.orderId,
      userId: data.artisanId,
      fromStatus: status,
      toStatus: status,
      note: `Balance de metal cerrado: Joya ${data.finalPieceWeight}g, Limalla ${data.scrapWeight}g, Merma ${balance.merma}g (${balance.porcentajeMerma}%).`,
    },
  });

export const registerMetalReturn = (data: DevolucionMetal) =>
  prisma.$transaction(async (tx) => {
    const { status, entregado, material } = await obtenerConsumo(tx, data);
    const balance = calcularBalanceMetal(entregado, data.finalPieceWeight, data.scrapWeight, material.unit);
    const actualizado = data.scrapWeight > 0 ? await reintegrarLimalla(tx, data) : material;

    const resumen = resumenBalance(data, entregado, balance);
    const audit = await auditarLiquidacion(tx, data, material, {
      ...resumen,
      alertaMermaInusual: balance.mermaInusual,
    });
    await registrarEnHistorial(tx, data, status, balance);

    return {
      balance: { ...resumen, mermaInusual: balance.mermaInusual },
      nuevoStockMaterial: Number(actualizado.stock),
      unidad: material.unit,
      auditId: audit.id,
    };
  });
