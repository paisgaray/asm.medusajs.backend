/**
 * Step: Format Password Reset Data
 * Formata os dados para o template "Reset Password" do SendGrid
 *
 * Este step:
 * 1. Recebe customer_id, email e token
 * 2. Gera URL de reset com o token
 * 3. Formata dados para o template
 *
 * Template ID: d-97f70554211843c08e630e384ae6951f
 * 
 * Variáveis do template:
 * - actionUrl: Link para redefinir senha com token
 */

import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { Modules } from '@medusajs/framework/utils';

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
    console.log(`[Format Password Reset] Formatando dados para email: ${email}`);

    // Buscar dados do customer no banco
    const customerModuleService = container.resolve(Modules.CUSTOMER);
    const customers = await customerModuleService.listCustomers({ id: customer_id });
    const customer = customers[0];

    const firstName = customer?.first_name || email.split('@')[0] || 'Cliente';

    console.log(`[Format Password Reset] Nome do cliente: ${firstName}`);

    // Gerar URL de reset com o token
    // A URL base vem do ambiente (frontend da loja)
    const storeUrl = process.env.STORE_URL || 'http://localhost:8000';
    const actionUrl = `${storeUrl}/reset-password?token=${token}`;

    console.log(`[Format Password Reset] URL gerada: ${actionUrl}`);

    // Formatar os dados para o template do SendGrid
    const emailData: ResetPasswordEmailData = {
      firstName, // ← ADICIONADO!
      actionUrl,
    };

    console.log(`[Format Password Reset] Dados formatados:`, JSON.stringify(emailData, null, 2));

    return new StepResponse({
      recipientEmail: email,
      templateId: SENDGRID_TEMPLATES.RESET_PASSWORD,
      templateData: emailData,
      subject: 'Restablecer contraseña', // Assunto do email em espanhol
    });
  },
);
