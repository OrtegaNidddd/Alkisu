import multer from 'multer';
const storage = multer.memoryStorage();
const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
];
export const uploadMiddleware = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Límite de 10 MB
    },
    fileFilter: (_req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Tipo de archivo no permitido. Solo JPG, PNG, WEBP o PDF.'));
        }
    },
});
