import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import cors from 'cors';
import clientRoutes from './routes/client.routes.js';
import authRoutes from './routes/auth.routes.js';
import orderRoutes from './routes/order.routes.js';
import quoteRoutes from './routes/quote.routes.js';
import materialRoutes from './routes/material.routes.js';
import userRoutes from './routes/user.routes.js';
import auditRoutes from './routes/audit.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import uploadRoutes from './routes/upload.route.js';
import { errorHandler } from './middlewares/error.middleware.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.disable('x-powered-by');
// Carga resiliente de documentación OpenAPI sin bloquear el inicio del servidor
let swaggerDocument = null;
const possibleSwaggerPaths = [
    path.resolve(process.cwd(), 'docs/openapi.yaml'),
    path.resolve(process.cwd(), 'backend/docs/openapi.yaml'),
    path.resolve(__dirname, '../docs/openapi.yaml'),
    path.resolve(__dirname, '../../docs/openapi.yaml'),
    path.resolve(__dirname, '../../../docs/openapi.yaml'),
];
for (const candidatePath of possibleSwaggerPaths) {
    try {
        if (fs.existsSync(candidatePath)) {
            swaggerDocument = YAML.load(candidatePath);
            if (swaggerDocument)
                break;
        }
    }
    catch (err) {
        // Intentar con el siguiente candidatePath
    }
}
if (!swaggerDocument) {
    swaggerDocument = {
        openapi: '3.0.0',
        info: {
            title: 'Papoi API - Taller de Joyería',
            version: '1.0.0',
            description: 'Documentación técnica de los servicios del taller Papoi',
        },
        paths: {},
    };
}
app.use(cors());
app.use(express.json());
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Servidor del Taller de Joyería activo' });
});
// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// Manejador centralizado de errores (Siempre al final)
app.use(errorHandler);
export default app;
