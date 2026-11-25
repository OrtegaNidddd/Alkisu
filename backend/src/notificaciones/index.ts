import { BrevoNotificacionAdapter } from './brevo.adapter.js';
import { INotificacionService } from './notificacion.service.js';

// Único punto donde se elige el proveedor.
export const notificaciones: INotificacionService = new BrevoNotificacionAdapter();
