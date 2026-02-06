import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export interface SendEmailInput {
  recipientEmail: string;
  templateId: string;
  templateData: Record<string, unknown>;
}

export const sendEmailStep = createStep(
  'send-email-step',
  async ({ recipientEmail, templateId, templateData }: SendEmailInput, { container }) => {
    const notificationModuleService = container.resolve(Modules.NOTIFICATION);

    await notificationModuleService.createNotifications({
      to: recipientEmail,
      channel: 'email',
      template: templateId,
      data: templateData,
    });

    return new StepResponse({ success: true, sentTo: recipientEmail });
  },
);
