/**
 * Workflow: Send Payment Approved Email
 * Orquestra o envio de e-mail de pagamento aprovado
 */

import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { SENDGRID_TEMPLATES } from '../../utils/sendgrid-templates';
import { formatPaymentApprovedDataStep } from './steps/format-payment-approved-data-step';
import { getOrderDataStep } from './steps/get-order-data-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendPaymentApprovedEmailInput {
  payment_id: string;
}

export const sendPaymentApprovedEmailWorkflow = createWorkflow(
  'send-payment-approved-email',
  (input: SendPaymentApprovedEmailInput) => {
    // Step 1: Buscar dados do pedido e pagamento
    const { order, payment } = getOrderDataStep({
      payment_id: input.payment_id,
    });

    // Step 2: Formatar dados para o template do SendGrid
    const { emailData, recipientEmail } = formatPaymentApprovedDataStep({
      order,
      payment,
    });

    // Step 3: Enviar e-mail via SendGrid
    const result = sendEmailStep({
      recipientEmail,
      templateId: SENDGRID_TEMPLATES.PAYMENT_APPROVED,
      templateData: emailData,
    });

    return new WorkflowResponse(result);
  },
);
