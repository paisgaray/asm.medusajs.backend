/**
 * Workflow: Send Order Confirmation Email
 * Orquestra o envio do e-mail "Pedido Confirmado"
 *
 * ✅ USANDO EVENTO NATIVO: order.placed
 *
 * Este workflow:
 * 1. Recebe order_id do evento order.placed
 * 2. Busca dados completos do pedido no banco
 * 3. Formata os dados para o template do SendGrid
 * 4. Envia o e-mail
 *
 * Template ID: d-51287e3277764d86aea821a1ea60c022 (Order Confirmation)
 */

import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SENDGRID_TEMPLATES } from '../../utils/sendgrid-templates';
import { formatOrderConfirmationDataStep } from './steps/format-order-confirmation-data-step';
import { getOrderByIdStep } from './steps/get-order-by-id-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendOrderConfirmationEmailInput {
  order_id: string;
}

export const sendOrderConfirmationEmailWorkflow = createWorkflow(
  'send-order-confirmation-email',
  (input: SendOrderConfirmationEmailInput) => {
    // Step 1: Buscar dados completos do pedido

    const { order, payment } = getOrderByIdStep({
      order_id: input.order_id,
    });

    // Step 2: Formatar dados para o template do SendGrid

    const { emailData, recipientEmail } = formatOrderConfirmationDataStep({
      order,
      payment,
    });

    // Step 3: Enviar e-mail

    const result = sendEmailStep({
      recipientEmail,
      templateId: SENDGRID_TEMPLATES.ORDER_CONFIRMATION,
      templateData: emailData,
      subject: 'Pedido confirmado',
    });

    return new WorkflowResponse(result);
  },
);
