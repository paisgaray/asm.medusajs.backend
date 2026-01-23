/**
 * Workflow: Send Password Reset Email
 * Orquestra o envio do e-mail "Redefinir Senha"
 *
 * Este workflow:
 * 1. Recebe customer_id, email e token do evento
 * 2. Gera URL de reset com o token
 * 3. Formata os dados para o template do SendGrid
 * 4. Envia o e-mail
 *
 * Template ID: d-97f70554211843c08e630e384ae6951f (Reset Password)
 */

import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { formatPasswordResetDataStep } from './steps/format-password-reset-data-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendPasswordResetEmailInput {
  customer_id: string;
  email: string;
  token: string;
}

export const sendPasswordResetEmailWorkflow = createWorkflow(
  'send-password-reset-email',
  (input: SendPasswordResetEmailInput) => {
    // Step 1: Formatar dados para o template do SendGrid
    const emailData = formatPasswordResetDataStep({
      customer_id: input.customer_id,
      email: input.email,
      token: input.token,
    });

    // Step 2: Enviar e-mail
    const result = sendEmailStep(emailData);

    return new WorkflowResponse(result);
  },
);
