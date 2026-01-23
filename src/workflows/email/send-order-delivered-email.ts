/**
 * Workflow: Send Order Delivered Email
 * Orquestra o envio do e-mail "Pedido Entregue"
 *
 * ✅ USANDO EVENTO NATIVO: delivery.created
 * Referência: https://docs.medusajs.com/resources/references/events#fulfillment-events
 *
 * Este workflow:
 * 1. Recebe fulfillment_id do evento nativo delivery.created
 * 2. Busca fulfillment e order_id associado
 * 3. Busca dados completos do pedido
 * 4. Formata os dados para o template do SendGrid
 * 5. Envia o e-mail
 *
 * Template ID: d-c0157e4c7a4a4ebe839fae834b9d6168 (Order Delivered)
 */

import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { formatOrderDeliveredDataStep } from './steps/format-order-delivered-data-step';
import { getFulfillmentOrderStep } from './steps/get-fulfillment-order-step';
import { getOrderByIdStep } from './steps/get-order-by-id-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendOrderDeliveredEmailInput {
  fulfillment_id: string;
}

export const sendOrderDeliveredEmailWorkflow = createWorkflow(
  'send-order-delivered-email',
  (input: SendOrderDeliveredEmailInput) => {
    // Step 1: Buscar fulfillment e obter order_id
    const { order_id } = getFulfillmentOrderStep({
      fulfillment_id: input.fulfillment_id,
    });

    // Step 2: Buscar dados completos do pedido
    const { order, payment } = getOrderByIdStep({
      order_id,
    });

    // Step 3: Formatar dados para o template do SendGrid
    const emailData = formatOrderDeliveredDataStep({
      order,
      payment,
    });

    // Step 4: Enviar e-mail
    const result = sendEmailStep(emailData);

    return new WorkflowResponse(result);
  },
);
