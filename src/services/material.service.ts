import prisma from '../lib/prisma.js';
import { MaterialType, MeasurementUnit } from '@prisma/client';

export const createMaterial = async (data: {
  name: string;
  type: MaterialType;
  unit: MeasurementUnit;
  stock: number;
  minStock: number;
}) => {
  return await prisma.material.create({
    data: {
      name: data.name,
      type: data.type,
      unit: data.unit,
      stock: data.stock,
      minStock: data.minStock,
    },
  });
};

export const getMaterials = async () => {
  const materials = await prisma.material.findMany({
    orderBy: { name: 'asc' },
  });

  return materials.map((m) => ({
    ...m,
    isLowStock: Number(m.stock) <= Number(m.minStock),
  }));
};

// Reabastecimiento con Auditoría
export const restockMaterial = async (data: {
  materialId: string;
  quantity: number;
  userId: string;
  ipAddress?: string;
}) => {
  if (data.quantity <= 0) {
    throw new Error('La cantidad a ingresar debe ser mayor a 0');
  }

  return await prisma.$transaction(async (tx) => {
    const current = await tx.material.findUnique({
      where: { id: data.materialId },
    });

    if (!current) throw new Error('Material no encontrado');

    const updatedMaterial = await tx.material.update({
      where: { id: data.materialId },
      data: {
        stock: {
          increment: data.quantity,
        },
      },
    });

    // Registro inmutable de auditoría
    await tx.auditLog.create({
      data: {
        userId: data.userId,
        action: 'REABASTECIMIENTO_MATERIAL',
        tableName: 'Material',
        recordId: data.materialId,
        ipAddress: data.ipAddress,
        details: {
          materialName: current.name,
          cantidadIngresada: data.quantity,
          stockAnterior: Number(current.stock),
          nuevoStock: Number(updatedMaterial.stock),
          unidad: current.unit,
        },
      },
    });

    return {
      ...updatedMaterial,
      isLowStock: Number(updatedMaterial.stock) <= Number(updatedMaterial.minStock),
    };
  });
};

// Consumo con Auditoría
export const consumeMaterialInOrder = async (data: {
  orderId: string;
  materialId: string;
  quantity: number;
  userId: string;
  ipAddress?: string;
}) => {
  return await prisma.$transaction(async (tx) => {
    const material = await tx.material.findUnique({
      where: { id: data.materialId },
    });

    if (!material) {
      throw new Error('Material no encontrado en inventario');
    }

    const currentStock = Number(material.stock);
    if (currentStock < data.quantity) {
      throw new Error(
        `Stock insuficiente de ${material.name}. Disponible: ${currentStock} ${material.unit}, Solicitado: ${data.quantity} ${material.unit}`
      );
    }

    const orderMaterial = await tx.orderMaterial.create({
      data: {
        orderId: data.orderId,
        materialId: data.materialId,
        quantity: data.quantity,
      },
    });

    const updatedMaterial = await tx.material.update({
      where: { id: data.materialId },
      data: {
        stock: {
          decrement: data.quantity,
        },
      },
    });

    // Auditoría del consumo en la orden
    await tx.auditLog.create({
      data: {
        userId: data.userId,
        action: 'CONSUMO_MATERIAL_PEDIDO',
        tableName: 'OrderMaterial',
        recordId: orderMaterial.id,
        ipAddress: data.ipAddress,
        details: {
          orderId: data.orderId,
          materialName: material.name,
          cantidadConsumida: data.quantity,
          stockRestante: Number(updatedMaterial.stock),
          unidad: material.unit,
        },
      },
    });

    const isLowStock = Number(updatedMaterial.stock) <= Number(updatedMaterial.minStock);

    return {
      orderMaterial,
      remainingStock: Number(updatedMaterial.stock),
      unit: updatedMaterial.unit,
      isLowStock,
      materialName: updatedMaterial.name,
    };
  });
};