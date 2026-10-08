import { Router } from 'express';
import { handleUploadFile } from '../controllers/upload.controller.js';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
const router = Router();
router.use(authenticateToken);
// Subida de archivo único (campo 'file' en el form-data)
router.post('/', uploadMiddleware.single('file'), handleUploadFile);
export default router;
