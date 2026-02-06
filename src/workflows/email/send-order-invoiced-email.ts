import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SENDGRID_TEMPLATES } from '../../constants/sendgrid-templates';
import { formatOrderStep } from './steps/format-order-step';
import { GetOrderByPaymentIdOutput, getOrderByPaymentIdStep } from './steps/get-order-by-paymentId-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendOrderInvoicedEmailInput {
  payment_id: string;
}

export const sendOrderInvoicedEmailWorkflow = createWorkflow(
  'send-order-invoiced-email',
  (input: SendOrderInvoicedEmailInput) => {
    const { order, payment } = getOrderByPaymentIdStep({ payment_id: input.payment_id }) as GetOrderByPaymentIdOutput;

    const { templateData, recipientEmail } = formatOrderStep({ order, payment });

    const result = sendEmailStep({
      templateId: SENDGRID_TEMPLATES.ORDER_INVOICED,
      recipientEmail,
      templateData,
    });

    return new WorkflowResponse(result);
  },
);
