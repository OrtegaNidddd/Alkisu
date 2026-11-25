// Ninguna prueba toca la base de datos, Supabase ni Brevo reales.
import { beforeEach, vi } from 'vitest';
import { prismaMock, reiniciarPrisma, enviarCorreo } from './ayudas.js';

vi.mock('../src/lib/prisma.js', () => ({ default: prismaMock }));
vi.mock('../src/lib/supabase.js', () => ({ supabase: {} }));
vi.mock('@getbrevo/brevo', () => ({
  BrevoClient: class {
    transactionalEmails = { sendTransacEmail: enviarCorreo };
  },
}));

beforeEach(() => {
  reiniciarPrisma();
  enviarCorreo.mockReset().mockResolvedValue({ messageId: 'msg-1' });
  vi.stubEnv('JWT_SECRET', 'secreto-solo-para-pruebas');
  vi.stubEnv('BREVO_API_KEY', 'clave-falsa');
  vi.stubEnv('BREVO_SENDER_EMAIL', 'taller@example.com');
  vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', 'admin@example.com');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
