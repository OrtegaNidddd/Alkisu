import prisma from '../src/lib/prisma.js';

async function check() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, fullName: true } });
  const materials = await prisma.material.findMany();
  const orders = await prisma.order.findMany();
  const clients = await prisma.client.findMany();
  const quotes = await prisma.quote.findMany({ include: { items: true } });

  console.log('--- DB STATUS ---');
  console.log(`Users (${users.length}):`, users);
  console.log(`Materials (${materials.length}):`, materials);
  console.log(`Clients (${clients.length}):`, clients);
  console.log(`Quotes (${quotes.length}):`, quotes);
  console.log(`Orders (${orders.length}):`, orders);
  
  await prisma.$disconnect();
}

check().catch(console.error);
