import express, { Application, Request, Response } from 'express';
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

import path from 'node:path';

const app: Application = express();
const swaggerDocument = YAML.load(path.resolve(process.cwd(), 'docs/openapi.yaml'));

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
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