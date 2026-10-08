import { BrevoClient } from '@getbrevo/brevo';
export const sendLowStockAlert = async (params) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || 'Taller Joyería';
    const recipient = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (!apiKey || !senderEmail || !recipient) {
        console.warn('[Brevo] Variables de entorno faltantes. Alerta por correo omitida.');
        return;
    }
    const brevo = new BrevoClient({ apiKey });
    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #b91c1c; margin-top: 0;">Alerta de Inventario en Taller</h2>
      <p style="color: #334155; font-size: 15px;">
        El insumo <strong>${params.materialName}</strong> ha caído a niveles críticos o por debajo de su umbral mínimo de seguridad.
      </p>
      <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0;">
        <span style="font-size: 18px; font-weight: bold; color: #0f172a;">
          Stock actual: ${params.remainingStock} ${params.unit}
        </span>
      </div>
      <p style="color: #64748b; font-size: 13px;">
        Por favor, gestiona una orden de compra o reabastecimiento para evitar retrasos en las piezas en fabricación.
      </p>
    </div>
  `;
    try {
        const data = await brevo.transactionalEmails.sendTransacEmail({
            subject: `⚠️ ALERTA DE STOCK CRÍTICO: ${params.materialName}`,
            sender: { name: senderName, email: senderEmail },
            to: [{ email: recipient }],
            htmlContent,
        });
        console.log(`[Brevo] Correo enviado exitosamente: Message ID ${data.messageId}`);
    }
    catch (error) {
        console.error('[Brevo] Error enviando correo:', error?.message || error);
    }
};
