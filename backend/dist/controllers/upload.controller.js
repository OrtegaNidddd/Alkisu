import * as storageService from '../services/storage.service.js';
export const handleUploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se envió ningún archivo' });
        }
        const folder = req.body.folder || 'pedidos';
        const result = await storageService.uploadFileToStorage(req.file, folder);
        res.status(201).json({
            message: 'Archivo subido correctamente a Supabase Storage',
            ...result,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error al procesar la subida' });
    }
};
