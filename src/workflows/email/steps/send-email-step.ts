import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { sendgridClient } from '../../../utils/sendgrid-client';

export interface SendEmailInput {
  recipientEmail: string;
  templateId: string;
  templateData: Record<string, unknown>;
  subject?: string; // Opcional: se não fornecido, usa o assunto do template SendGrid
}

export const sendEmailStep = createStep(
  'send-email-step',
  async ({ recipientEmail, templateId, templateData, subject }: SendEmailInput) => {
    const timestamp = new Date().toISOString();

    console.log(`[SendEmail Step] 📧 Iniciando envio de email...`);
    console.log(`[SendEmail Step] Destinatário: ${recipientEmail}`);
    console.log(`[SendEmail Step] Template ID: ${templateId}`);
    console.log(`[SendEmail Step] Subject: ${subject || 'N/A'}`);
    console.log(`[SendEmail Step] From Email: ${process.env.SENDGRID_FROM_EMAIL || 'NÃO CONFIGURADO!'}`);
    console.log(`[SendEmail Step] SendGrid API Key configurada: ${!!process.env.SENDGRID_API_KEY}`);
    console.log(`[SendEmail Step] Timestamp: ${timestamp}`);

    try {
      const emailPayload = {
        to: recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL!,
        templateId,
        dynamicTemplateData: templateData,
        ...(subject && { subject }),
      };

      console.log(`[SendEmail Step] Payload completo:`, JSON.stringify(emailPayload, null, 2));
      console.log(`[SendEmail Step] Chamando sendgridClient.send()...`);

      const result = await sendgridClient.send(emailPayload);

      console.log(`[SendEmail Step] ✅ Email enviado com sucesso!`);
      console.log(`[SendEmail Step] SendGrid Response:`, JSON.stringify(result, null, 2));
      console.log(`[SendEmail Step] Status Code:`, result[0]?.statusCode);
      console.log(`[SendEmail Step] Response Headers:`, result[0]?.headers);

      return new StepResponse({ success: true, sentTo: recipientEmail });
    } catch (error) {
      console.error(`[SendEmail Step] ❌ ERRO ao enviar e-mail:`, error);
      if (error instanceof Error) {
        console.error(`[SendEmail Step] Mensagem de erro:`, error.message);
        console.error(`[SendEmail Step] Stack trace:`, error.stack);
      }
      if (error && typeof error === 'object' && 'response' in error) {
        const sgError = error as { response?: { body?: unknown; statusCode?: number; headers?: unknown } };
        console.error(`[SendEmail Step] SendGrid Response Body:`, JSON.stringify(sgError.response?.body, null, 2));
        console.error(`[SendEmail Step] SendGrid Status Code:`, sgError.response?.statusCode);
        console.error(
          `[SendEmail Step] SendGrid Response Headers:`,
          JSON.stringify(sgError.response?.headers, null, 2),
        );
      }
      throw error;
    }
  },
);
