import prisma from '../lib/prisma';

export const createClient = async (data: {
  fullName: string;
  phone: string;
  email?: string;
  documentId?: string;
}) => {
  return await prisma.client.create({ data });
};

export const getClients = async () => {
  return await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

export const updateClient = async (id: string, data: {
  fullName: string;
  phone: string;
  email?: string;
  documentId?: string;
}) => {
  return await prisma.client.update({
    where: { id },
    data,
  });
};

export const deleteClient = async (id: string) => {
  return await prisma.client.delete({
    where: { id },
  });
};