/**
 * Workflow: Send Order Invoiced Email
 * Orquestra o envio de e-mail de pedido faturado
 */

import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SENDGRID_TEMPLATES } from '../../utils/sendgrid-templates';
import { formatOrderInvoicedDataStep } from './steps/format-order-invoiced-data-step';
import { getOrderByIdStep } from './steps/get-order-by-id-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendOrderInvoicedEmailInput {
  order_id: string;
}

export const sendOrderInvoicedEmailWorkflow = createWorkflow(
  'send-order-invoiced-email',
  (input: SendOrderInvoicedEmailInput) => {
    // Step 1: Buscar dados do pedido
    const { order, payment } = getOrderByIdStep({
      order_id: input.order_id,
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
