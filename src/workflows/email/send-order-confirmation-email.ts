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
    console.log(`[Order Confirmation Workflow] Iniciando workflow para order_id: ${input.order_id}`);

    // Step 1: Buscar dados completos do pedido
    console.log(`[Order Confirmation Workflow] Step 1: Buscando dados do pedido...`);
    const { order, payment } = getOrderByIdStep({
      order_id: input.order_id,
    });
    console.log(`[Order Confirmation Workflow] Step 1: Pedido encontrado - ID: ${order?.id}, Email: ${order?.email}`);

    // Step 2: Formatar dados para o template do SendGrid
    console.log(`[Order Confirmation Workflow] Step 2: Formatando dados para template...`);
    const { emailData, recipientEmail } = formatOrderConfirmationDataStep({
      order,
      payment,
    });
    console.log(`[Order Confirmation Workflow] Step 2: Dados formatados - Email destinatário: ${recipientEmail}`);

    // Step 3: Enviar e-mail
    console.log(`[Order Confirmation Workflow] Step 3: Enviando email via SendGrid...`);
    const result = sendEmailStep({
      recipientEmail,
      templateId: SENDGRID_TEMPLATES.ORDER_CONFIRMATION,
      templateData: emailData,
      subject: 'Pedido confirmado',
    });
    console.log(`[Order Confirmation Workflow] ✅ Workflow concluído com sucesso!`);

    return new WorkflowResponse(result);
  },
);
