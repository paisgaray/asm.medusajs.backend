import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { TamplateLang } from '../../constants/sendgrid-templates';
import { formatOrderStep } from './steps/format-order-step';
import { getOrderByFulfillmentIdStep } from './steps/get-order-by-fulfillmentId-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendOrderDeliveredEmailInput {
  fulfillment_id: string;
}

export const sendOrderDeliveredEmailWorkflow = createWorkflow(
  'send-order-delivered-email',
  (input: SendOrderDeliveredEmailInput) => {
    const { order, payment } = getOrderByFulfillmentIdStep({ fulfillment_id: input.fulfillment_id });

    const { templateData, recipientEmail } = formatOrderStep({ order, payment });

    const result = sendEmailStep({
      language: order.metadata.language as TamplateLang,
      template: 'ORDER_DELIVERED',
      recipientEmail,
      templateData,
    });

    return new WorkflowResponse(result);
  },
);
