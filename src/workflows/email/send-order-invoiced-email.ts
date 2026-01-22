/**
 * Workflow: Send Order Invoiced Email
 * Orquestra o envio do e-mail "Pedido Faturado"
 *
 * ✅ USANDO EVENTO NATIVO: payment.captured
 *
 * Este workflow:
 * 1. Recebe payment_id do evento payment.captured
 * 2. Busca dados completos do pedido no banco
 * 3. Formata os dados para o template do SendGrid
 * 4. Envia o e-mail
 *
 * Template ID: d-c3c0dd4a6d0a46d6ab25da1ce99f6f89 (Order Invoiced)
 * 
 * ⚠️ NOTA: Enviado junto com "Payment Approved" no mesmo evento
 */

import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SENDGRID_TEMPLATES } from '../../utils/sendgrid-templates';
import { formatOrderInvoicedDataStep } from './steps/format-order-invoiced-data-step';
import { getOrderDataStep } from './steps/get-order-data-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendOrderInvoicedEmailInput {
  payment_id: string;
}

export const sendOrderInvoicedEmailWorkflow = createWorkflow(
  'send-order-invoiced-email',
  (input: SendOrderInvoicedEmailInput) => {
    // Step 1: Buscar dados do pedido e pagamento a partir do payment_id
    const { order, payment } = getOrderDataStep({
      payment_id: input.payment_id,
    });

    // Step 2: Formatar dados para o template do SendGrid
    const { emailData, recipientEmail } = formatOrderInvoicedDataStep({
      order,
      payment,
    });

    // Step 3: Enviar e-mail via SendGrid
    const result = sendEmailStep({
      recipientEmail,
      templateId: SENDGRID_TEMPLATES.ORDER_INVOICED,
      templateData: emailData,
    });

    return new WorkflowResponse(result);
  },
);
