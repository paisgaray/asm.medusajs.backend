import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SENDGRID_TEMPLATES, TamplateLang } from '../../../constants/sendgrid-templates';

export interface SendEmailInput {
  recipientEmail: string;
  language: TamplateLang;
  template: string;
  templateData: Record<string, unknown>;
}

export const sendEmailStep = createStep(
  'send-email-step',
  async ({ recipientEmail, language, template, templateData }: SendEmailInput, { container }) => {
    const notificationModuleService = container.resolve(Modules.NOTIFICATION);

    await notificationModuleService.createNotifications({
      to: recipientEmail,
      channel: 'email',
      template: SENDGRID_TEMPLATES[language][template],
      data: templateData,
    });

    return new StepResponse({ success: true, sentTo: recipientEmail });
  },
);
