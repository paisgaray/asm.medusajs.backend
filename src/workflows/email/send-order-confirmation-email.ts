import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SENDGRID_TEMPLATES } from '../../constants/sendgrid-templates';
import { formatOrderStep } from './steps/format-order-step';
import { GetOrderByIdOutput, getOrderByIdStep } from './steps/get-order-by-id-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendOrderConfirmationEmailInput {
  order_id: string;
}

export const sendOrderConfirmationEmailWorkflow = createWorkflow(
  'send-order-confirmation-email',
  (input: SendOrderConfirmationEmailInput) => {
    const { order, payment } = getOrderByIdStep({ order_id: input.order_id }) as GetOrderByIdOutput;

    const { templateData, recipientEmail } = formatOrderStep({ order, payment });

    const result = sendEmailStep({
      templateId: SENDGRID_TEMPLATES.ORDER_CONFIRMATION,
      recipientEmail,
      templateData,
    });

    return new WorkflowResponse(result);
  },
);
