import { BrevoNotificacionAdapter } from './brevo.adapter.js';
// Único punto donde se elige el proveedor.
export const notificaciones = new BrevoNotificacionAdapter();
