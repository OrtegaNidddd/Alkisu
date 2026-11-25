import prisma from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const secret = process.env.JWT_SECRET || 'secret_fallback';

  // 1. Ensure Asesor exists
  let asesor = await prisma.user.findUnique({ where: { email: 'asesor@joyeria.com' } });
  if (!asesor) {
    const hash = await bcrypt.hash('papoi123', 10);
    asesor = await prisma.user.create({
      data: {
        fullName: 'Valeria Morales (Asesora)',
        email: 'asesor@joyeria.com',
        passwordHash: hash,
        role: 'ASESOR',
      },
    });
  }

  const admin = await prisma.user.findUnique({ where: { email: 'admin@joyeria.com' } });
  const joyero = await prisma.user.findUnique({ where: { email: 'joyero@joyeria.com' } });

  const tokens = {
    ADMIN: jwt.sign({ id: admin?.id, email: admin?.email, role: 'ADMIN' }, secret, { expiresIn: '365d' }),
    ASESOR: jwt.sign({ id: asesor.id, email: asesor.email, role: 'ASESOR' }, secret, { expiresIn: '365d' }),
    JOYERO: jwt.sign({ id: joyero?.id, email: joyero?.email, role: 'JOYERO' }, secret, { expiresIn: '365d' }),
  };

  console.log(JSON.stringify(tokens, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
