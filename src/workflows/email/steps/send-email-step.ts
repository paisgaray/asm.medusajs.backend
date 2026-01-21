import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { sendgridClient } from '../../../utils/sendgrid-client';

export interface SendEmailInput {
  recipientEmail: string;
  templateId: string;
  templateData: Record<string, unknown>;
}

export const sendEmailStep = createStep(
  'send-email-step',
  async ({ recipientEmail, templateId, templateData }: SendEmailInput) => {
    try {
      console.log('[SendGrid] Enviando e-mail para:', recipientEmail);
      console.log('[SendGrid] Template ID:', templateId);

      await sendgridClient.send({
        to: recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL!,
        templateId,
        dynamicTemplateData: templateData,
      });

      console.log('[SendGrid] E-mail enviado com sucesso!');
      return new StepResponse({ success: true, sentTo: recipientEmail });
    } catch (error) {
      console.error('[SendGrid] Erro ao enviar e-mail:', error);
      throw error;
    }
  },
);
