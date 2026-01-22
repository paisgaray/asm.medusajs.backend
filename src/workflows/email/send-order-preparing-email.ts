import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SENDGRID_TEMPLATES } from '../../utils/sendgrid-templates';
import { formatOrderPreparingDataStep } from './steps/format-order-preparing-data-step';
import { getOrderByIdStep } from './steps/get-order-by-id-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendOrderPreparingEmailInput {
  order_id: string;
}

export const sendOrderPreparingEmailWorkflow = createWorkflow(
  'send-order-preparing-email',
  (input: SendOrderPreparingEmailInput) => {
    // Step 1: Buscar dados do pedido
    const { order, payment } = getOrderByIdStep({ order_id: input.order_id });

    // Step 2: Formatar dados para o template
    const { emailData, recipientEmail } = formatOrderPreparingDataStep({ order, payment });

    // Step 3: Enviar e-mail
    const result = sendEmailStep({
      recipientEmail,
      templateId: SENDGRID_TEMPLATES.ORDER_PREPARING,
      templateData: emailData,
      subject: 'Pedido en preparación',
    });

    return new WorkflowResponse(result);
  },
);
