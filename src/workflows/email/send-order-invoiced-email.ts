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
      subject: 'Factura de tu pedido',
    });

    return new WorkflowResponse(result);
  },
);
