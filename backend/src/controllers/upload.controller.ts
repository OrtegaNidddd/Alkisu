import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as storageService from '../services/storage.service.js';

export const handleUploadFile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ningún archivo' });
  }

  const folder = (req.body.folder as 'bocetos' | 'pedidos' | 'calidad') || 'pedidos';
  const result = await storageService.uploadFileToStorage(req.file, folder);

  res.status(201).json({
    message: 'Archivo subido correctamente a Supabase Storage',
    ...result,
  });
};
