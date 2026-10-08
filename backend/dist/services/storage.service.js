import { supabase } from '../lib/supabase.js';
import crypto from 'node:crypto';
import path from 'node:path';
export const uploadFileToStorage = async (file, folder = 'pedidos') => {
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'jewelry-assets';
    // Generar nombre único para evitar colisiones
    const fileExt = path.extname(file.originalname);
    const fileName = `${folder}/${Date.now()}-${crypto.randomUUID()}${fileExt}`;
    const { error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
    });
    if (error) {
        throw new Error(`Error al subir imagen a Supabase Storage: ${error.message}`);
    }
    // Obtener URL pública
    const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
    return {
        filePath: fileName,
        publicUrl: publicData.publicUrl,
    };
};
