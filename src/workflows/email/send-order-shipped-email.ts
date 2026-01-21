/**
 * Workflow: Send Order Shipped Email
 * Orquestra o processo de envio do e-mail "Order Shipped"
 *
 * Este workflow:
 * 1. Busca os dados completos do pedido e pagamento
 * 2. Formata os dados para o template SendGrid
 * 3. Envia o e-mail via SendGrid
 *
 * Template ID: d-4901f2e3d61c47c2b5f9569065c08616
 * Evento: order.shipment_created (nativo)
 */

import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SENDGRID_TEMPLATES } from '../../utils/sendgrid-templates';
import { formatOrderShippedDataStep } from './steps/format-order-shipped-data-step';
import { getOrderByIdStep } from './steps/get-order-by-id-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendOrderShippedEmailInput {
  order_id: string;
}

export const sendOrderShippedEmailWorkflow = createWorkflow(
  'send-order-shipped-email',
  (input: SendOrderShippedEmailInput) => {
    // Step 1: Buscar dados do pedido
    const { order, payment } = getOrderByIdStep({ order_id: input.order_id });

    // Step 2: Formatar dados para o template
    const { emailData, recipientEmail } = formatOrderShippedDataStep({ order, payment });

    // Step 3: Enviar e-mail
    const result = sendEmailStep({
      recipientEmail,
      templateId: SENDGRID_TEMPLATES.ORDER_SHIPPED,
      templateData: emailData,
    });

    return new WorkflowResponse(result);
  },
);
