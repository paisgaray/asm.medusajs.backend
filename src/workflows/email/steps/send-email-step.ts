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
    try {
      console.log('[SendGrid] Enviando e-mail para:', recipientEmail);
      console.log('[SendGrid] Template ID:', templateId);
      if (subject) {
        console.log('[SendGrid] Assunto:', subject);
      }

      await sendgridClient.send({
        to: recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL!,
        templateId,
        dynamicTemplateData: templateData,
        ...(subject && { subject }), // Adiciona subject se fornecido
      });

      console.log('[SendGrid] E-mail enviado com sucesso!');
      return new StepResponse({ success: true, sentTo: recipientEmail });
    } catch (error) {
      console.error('[SendGrid] Erro ao enviar e-mail:', error);
      throw error;
    }
  },
);
