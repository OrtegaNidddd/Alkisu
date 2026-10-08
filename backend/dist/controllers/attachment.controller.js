import * as attachmentService from '../services/attachment.service.js';
import { AttachmentType } from '@prisma/client';
export const handleAddAttachment = async (req, res) => {
    try {
        const { fileUrl, fileName, fileType, description } = req.body;
        const { id: orderId } = req.params;
        if (!fileUrl || !fileName) {
            return res.status(400).json({ error: 'fileUrl y fileName son requeridos' });
        }
        if (fileType && !Object.values(AttachmentType).includes(fileType)) {
            return res.status(400).json({
                error: `fileType inválido. Válidos: ${Object.values(AttachmentType).join(', ')}`,
            });
        }
        const attachment = await attachmentService.addAttachmentToOrder({
            orderId,
            fileUrl,
            fileName,
            fileType,
            description,
        });
        res.status(201).json(attachment);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
export const handleGetAttachments = async (req, res) => {
    try {
        const attachments = await attachmentService.getOrderAttachments(req.params.id);
        res.json(attachments);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al consultar adjuntos del pedido' });
    }
};
