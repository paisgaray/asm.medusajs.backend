/**
 * Step: Send Email via SendGrid
 * Envia o e-mail usando o Notification Module com SendGrid
 */

import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { Modules } from '@medusajs/framework/utils';

export interface SendEmailInput {
  recipientEmail: string;
  templateId: string;
  templateData: any;
}

export const sendEmailStep = createStep(
  'send-email-step',
  async ({ recipientEmail, templateId, templateData }: SendEmailInput, { container }) => {
    const notificationModule = container.resolve(Modules.NOTIFICATION);

    try {
      await notificationModule.createNotifications({
        to: recipientEmail,
        channel: 'email',
        template: templateId,
        data: templateData,
      });

      return new StepResponse({ success: true, sentTo: recipientEmail });
    } catch (error) {
      console.error('[SendGrid] Erro ao enviar e-mail:', error);
      throw error;
    }
  },
);
