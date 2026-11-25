import prisma from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  const hash = await bcrypt.hash('papoi123', 10);
  
  // Ensure default users
  const defaultUsers = [
    { email: 'admin@joyeria.com', fullName: 'Director General Papoi (Admin)', role: 'ADMIN' },
    { email: 'asesor@joyeria.com', fullName: 'Valeria Morales (Asesora Comercial)', role: 'ASESOR' },
    { email: 'joyero@joyeria.com', fullName: 'Maestro Mateo Rivera (Joyero)', role: 'JOYERO' },
  ];

  for (const u of defaultUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: u.email,
          fullName: u.fullName,
          role: u.role as any,
          passwordHash: hash,
        },
      });
      console.log(`Created user ${u.email}`);
    } else {
      await prisma.user.update({
        where: { email: u.email },
        data: {
          fullName: u.fullName,
          role: u.role as any,
          passwordHash: hash,
        },
      });
      console.log(`Updated user ${u.email}`);
    }
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true },
  });
  console.log('All DB Users:', users);

  await prisma.$disconnect();
}

main().catch(console.error);
