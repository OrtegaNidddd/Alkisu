import prisma from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';
import { MaterialType, MeasurementUnit, Role } from '@prisma/client';

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('Retry failed');
}

async function main() {
  console.log('--- SEEDING COMPLETE WORKSHOP DATABASE ---');
  const hash = await bcrypt.hash('alkisu123', 10);

  // 1. USUARIOS (Ambos dominios: @alkisu.com y @joyeria.com)
  const usersToSeed = [
    { email: 'admin@alkisu.com', fullName: 'Director General Alkisu (Admin)', role: Role.ADMIN },
    { email: 'asesor@alkisu.com', fullName: 'Valeria Morales (Asesora Comercial)', role: Role.ASESOR },
    { email: 'joyero@alkisu.com', fullName: 'Maestro Mateo Rivera (Joyero)', role: Role.JOYERO },
    { email: 'admin@joyeria.com', fullName: 'Director General Alkisu (Admin)', role: Role.ADMIN },
    { email: 'asesor@joyeria.com', fullName: 'Valeria Morales (Asesora Comercial)', role: Role.ASESOR },
    { email: 'joyero@joyeria.com', fullName: 'Maestro Mateo Rivera (Joyero)', role: Role.JOYERO },
  ];

  for (const u of usersToSeed) {
    await withRetry(async () => {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (!existing) {
        await prisma.user.create({
          data: {
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            passwordHash: hash,
          },
        });
        console.log(`+ Creado usuario: ${u.email}`);
      } else {
        await prisma.user.update({
          where: { email: u.email },
          data: {
            fullName: u.fullName,
            role: u.role,
            passwordHash: hash,
          },
        });
        console.log(`* Actualizado usuario: ${u.email}`);
      }
    });
  }

  // 2. CLIENTES
  const clientsToSeed = [
    {
      fullName: 'Carolina Gómez Restrepo',
      phone: '+57 310 458 9201',
      email: 'carolina.gomez@empresa.com',
      documentId: 'CC 52.894.102',
    },
    {
      fullName: 'David Fernando Echeverri',
      phone: '+57 301 234 5678',
      email: 'david.echeverri@medellin.co',
      documentId: 'CC 71.392.441',
    },
    {
      fullName: 'Isabella Santo Domingo',
      phone: '+57 315 998 7766',
      email: 'isabella.sd@luxury.com',
      documentId: 'CC 43.112.509',
    },
    {
      fullName: 'Andrés Felipe Osorio',
      phone: '+57 320 887 1122',
      email: 'andres.osorio@bogota.co',
      documentId: 'CC 80.201.332',
    },
    {
      fullName: 'Carlos Gómez',
      phone: '3109876543',
      email: 'carlos.gomez@gmail.com',
      documentId: '1090123456',
    },
  ];

  for (const c of clientsToSeed) {
    await withRetry(async () => {
      const existing = await prisma.client.findFirst({
        where: {
          OR: [
            { email: c.email },
            { documentId: c.documentId },
          ],
        },
      });

      if (!existing) {
        await prisma.client.create({ data: c });
        console.log(`+ Creado cliente: ${c.fullName}`);
      }
    });
  }

  // 3. MATERIALES DE BODEGA (Metales + Gemas)
  const materialsToSeed = [
    {
      name: 'Oro Amarillo 18k (Grano Nacional)',
      type: MaterialType.ORO_AMARILLO_18K,
      unit: MeasurementUnit.GRAMOS,
      stock: 245.58,
      minStock: 80.00,
    },
    {
      name: 'Oro Blanco 18k con Paladio',
      type: MaterialType.ORO_BLANCO_18K,
      unit: MeasurementUnit.GRAMOS,
      stock: 45.20,
      minStock: 30.00,
    },
    {
      name: 'Oro Rosa 18k Italiano',
      type: MaterialType.ORO_ROSA_18K,
      unit: MeasurementUnit.GRAMOS,
      stock: 62.80,
      minStock: 30.00,
    },
    {
      name: 'Oro 14k Nacional (Ley 585)',
      type: MaterialType.ORO_14K,
      unit: MeasurementUnit.GRAMOS,
      stock: 120.00,
      minStock: 40.00,
    },
    {
      name: 'Plata Ley 925 Purificada',
      type: MaterialType.PLATA_925,
      unit: MeasurementUnit.GRAMOS,
      stock: 850.00,
      minStock: 200.00,
    },
    {
      name: 'Esmeralda Colombiana Muzo 1.25ct Certificada',
      type: MaterialType.PIEDRA_PRECIOSA,
      unit: MeasurementUnit.KILATES,
      stock: 1.25,
      minStock: 3.00,
    },
    {
      name: 'Diamante Natural Brillante 0.80ct VS1 Color F',
      type: MaterialType.PIEDRA_PRECIOSA,
      unit: MeasurementUnit.KILATES,
      stock: 4.80,
      minStock: 2.00,
    },
    {
      name: 'Zafiro Azul Ceilán Corte Oval 2.10ct',
      type: MaterialType.PIEDRA_PRECIOSA,
      unit: MeasurementUnit.KILATES,
      stock: 2.10,
      minStock: 2.00,
    },
    {
      name: 'Rubí Natural Birmano 1.50ct',
      type: MaterialType.PIEDRA_PRECIOSA,
      unit: MeasurementUnit.KILATES,
      stock: 1.50,
      minStock: 1.00,
    },
    {
      name: 'Circonio Suizo Grado 5A (Lote microengaste)',
      type: MaterialType.PIEDRA_PRECIOSA,
      unit: MeasurementUnit.KILATES,
      stock: 50.00,
      minStock: 20.00,
    },
  ];

  for (const m of materialsToSeed) {
    await withRetry(async () => {
      const existing = await prisma.material.findFirst({
        where: { name: m.name },
      });

      if (!existing) {
        await prisma.material.create({
          data: {
            name: m.name,
            type: m.type,
            unit: m.unit,
            stock: m.stock,
            minStock: m.minStock,
          },
        });
        console.log(`+ Creado material en bodega: ${m.name}`);
      } else {
        await prisma.material.update({
          where: { id: existing.id },
          data: {
            stock: m.stock,
            minStock: m.minStock,
          },
        });
        console.log(`* Actualizado stock de: ${m.name}`);
      }
    });
  }

  console.log('--- SEED COMPLETADO CON ÉXITO ---');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error seeding DB:', err);
  process.exit(1);
});
