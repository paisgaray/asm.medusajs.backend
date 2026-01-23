/**
 * Workflow: Send Payment Not Approved Email
 * Orquestra o envio de e-mail de pagamento não aprovado/rejeitado
 */

import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SENDGRID_TEMPLATES } from '../../utils/sendgrid-templates';
import { formatPaymentNotApprovedDataStep } from './steps/format-payment-not-approved-data-step';
import { getOrderDataStep } from './steps/get-order-data-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendPaymentNotApprovedEmailInput {
  payment_id: string;
}

export const sendPaymentNotApprovedEmailWorkflow = createWorkflow(
  'send-payment-not-approved-email',
  (input: SendPaymentNotApprovedEmailInput) => {
    // Step 1: Buscar dados do pedido e pagamento
    const { order, payment } = getOrderDataStep({
      payment_id: input.payment_id,
    });

    // Step 2: Formatar dados para o template do SendGrid
    const { emailData, recipientEmail } = formatPaymentNotApprovedDataStep({
      order,
      payment,
    });

    // Step 3: Enviar e-mail via SendGrid
    const result = sendEmailStep({
      recipientEmail,
      templateId: SENDGRID_TEMPLATES.PAYMENT_NOT_APPROVED,
      templateData: emailData,
    });

    return new WorkflowResponse(result);
  },
);
