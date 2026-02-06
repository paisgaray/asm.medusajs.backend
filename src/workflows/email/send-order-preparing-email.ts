import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SENDGRID_TEMPLATES } from '../../constants/sendgrid-templates';
import { formatOrderStep } from './steps/format-order-step';
import { GetOrderByIdOutput, getOrderByIdStep } from './steps/get-order-by-id-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendOrderPreparingEmailInput {
  order_id: string;
}

export const sendOrderPreparingEmailWorkflow = createWorkflow(
  'send-order-preparing-email',
  (input: SendOrderPreparingEmailInput) => {
    const { order, payment } = getOrderByIdStep({ order_id: input.order_id }) as GetOrderByIdOutput;

    const { templateData, recipientEmail } = formatOrderStep({ order, payment });

    const result = sendEmailStep({
      templateId: SENDGRID_TEMPLATES.ORDER_PREPARING,
      recipientEmail,
      templateData,
    });

    return new WorkflowResponse(result);
  },
);
