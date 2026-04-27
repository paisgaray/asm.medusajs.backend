import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { TamplateLang } from '../../constants/sendgrid-templates';
import { formatOrderStep } from './steps/format-order-step';
import { GetOrderByFulfillmentIdOutput, getOrderByFulfillmentIdStep } from './steps/get-order-by-fulfillmentId-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendOrderShippedEmailInput {
  fulfillment_id: string;
}

export const sendOrderShippedEmailWorkflow = createWorkflow(
  'send-order-shipped-email',
  (input: SendOrderShippedEmailInput) => {
    const { order, payment } = getOrderByFulfillmentIdStep({
      fulfillment_id: input.fulfillment_id,
    }) as GetOrderByFulfillmentIdOutput;

    const { templateData, recipientEmail } = formatOrderStep({ order, payment });

    const result = sendEmailStep({
      language: order.metadata.language as TamplateLang,
      template: 'ORDER_SHIPPED',
      recipientEmail,
      templateData,
    });

    return new WorkflowResponse(result);
  },
);
