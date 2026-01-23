import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import type { ResetPasswordEmailData } from '../../../types/email-templates';
import { SENDGRID_TEMPLATES } from '../../../utils/sendgrid-templates';

export interface FormatPasswordResetDataInput {
  customer_id: string;
  email: string;
  token: string;
}

export const formatPasswordResetDataStep = createStep(
  'format-password-reset-data-step',
  async ({ customer_id, email, token }: FormatPasswordResetDataInput, { container }) => {
    const customerModuleService = container.resolve(Modules.CUSTOMER);
    const customers = await customerModuleService.listCustomers({ id: customer_id });
    const customer = customers[0];

    const firstName = customer?.first_name || email.split('@')[0] || 'Cliente';
    const storeUrl = process.env.STORE_URL || 'http://localhost:8000';
    const actionUrl = `${storeUrl}/reset-password?token=${token}`;

    const emailData: ResetPasswordEmailData = {
      firstName,
      actionUrl,
    };

    return new StepResponse({
      recipientEmail: email,
      templateId: SENDGRID_TEMPLATES.RESET_PASSWORD,
      templateData: emailData,
      subject: 'Restablecer contraseña',
    });
  },
);
