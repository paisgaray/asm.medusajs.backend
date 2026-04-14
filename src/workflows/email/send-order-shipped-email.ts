import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SENDGRID_TEMPLATES, TamplateLang } from '../../constants/sendgrid-templates';
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

    const language = order.metadata.language as TamplateLang;

    const result = sendEmailStep({
      templateId: SENDGRID_TEMPLATES[language].ORDER_CONFIRMATION,
      recipientEmail,
      templateData,
    });

    return new WorkflowResponse(result);
  },
);
