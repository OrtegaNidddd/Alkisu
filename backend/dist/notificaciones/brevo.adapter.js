import { BrevoClient } from '@getbrevo/brevo';
import { asuntoStockBajo, htmlStockBajo } from './plantillas.js';
const leerConfiguracion = () => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const recipient = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (!apiKey || !senderEmail || !recipient)
        return null;
    return { apiKey, senderEmail, recipient, senderName: process.env.BREVO_SENDER_NAME || 'Taller Joyería' };
};
/** Adapta el SDK de Brevo al contrato INotificacionService. */
export class BrevoNotificacionAdapter {
    async enviarAlertaStockBajo(alerta) {
        const config = leerConfiguracion();
        if (!config) {
            console.warn('[Brevo] Variables de entorno faltantes. Alerta por correo omitida.');
            return;
        }
        try {
            const brevo = new BrevoClient({ apiKey: config.apiKey });
            const data = await brevo.transactionalEmails.sendTransacEmail({
                subject: asuntoStockBajo(alerta),
                sender: { name: config.senderName, email: config.senderEmail },
                to: [{ email: config.recipient }],
                htmlContent: htmlStockBajo(alerta),
            });
            console.log(`[Brevo] Correo enviado exitosamente: Message ID ${data.messageId}`);
        }
        catch (error) {
            // Un fallo del proveedor no debe afectar la operación del taller.
            console.error('[Brevo] Error enviando correo:', error instanceof Error ? error.message : error);
        }
    }
}
