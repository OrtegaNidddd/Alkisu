// src/app.ts
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import clientRoutes from './routes/client.routes';
import authRoutes from './routes/auth.routes';

const app: Application = express();

app.use(cors());
app.use(express.json());

// Endpoint de prueba de salud
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Servidor del Sistema de Gestión Integral para Joyerías activo' });
});

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);

export default app;