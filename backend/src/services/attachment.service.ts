import prisma from '../lib/prisma.js';
import { pedidoNoEncontrado } from '../lib/errors.js';
import { AttachmentType } from '@prisma/client';

export const addAttachmentToOrder = async (data: {
  orderId: string;
  fileUrl: string;
  fileName: string;
  fileType?: AttachmentType;
  description?: string;
}) => {
  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
  });

  if (!order) throw pedidoNoEncontrado();

  return await prisma.orderAttachment.create({
    data: {
      orderId: data.orderId,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileType: data.fileType || AttachmentType.BOCETO_REFERENCIA,
      description: data.description,
    },
  });
};

export const getOrderAttachments = async (orderId: string) => {
  return await prisma.orderAttachment.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });
};
