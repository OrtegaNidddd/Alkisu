// src/server.ts
import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import { obtenerJwtSecret } from './config/jwt.js';
obtenerJwtSecret(); // falla al arrancar si falta la configuración
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor escuchando en http://0.0.0.0:${PORT}`);
});
