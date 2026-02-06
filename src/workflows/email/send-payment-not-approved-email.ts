import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SENDGRID_TEMPLATES } from '../../constants/sendgrid-templates';
import { formatOrderStep } from './steps/format-order-step';
import { GetOrderByIdOutput, getOrderByIdStep } from './steps/get-order-by-id-step';
import { sendEmailStep } from './steps/send-email-step';
// import { getOrderByPaymentIdStep } from './steps/get-order-by-paymentId-step';

export interface SendPaymentNotApprovedEmailInput {
  payment_id: string;
}

export const sendPaymentNotApprovedEmailWorkflow = createWorkflow(
  'send-payment-not-approved-email',
  (input: SendPaymentNotApprovedEmailInput) => {
    const { order, payment } = getOrderByIdStep({ order_id: input.payment_id }) as GetOrderByIdOutput;

    const { templateData, recipientEmail } = formatOrderStep({ order, payment });

    const result = sendEmailStep({
      templateId: SENDGRID_TEMPLATES.PAYMENT_NOT_APPROVED,
      recipientEmail,
      templateData,
    });

    return new WorkflowResponse(result);
  },
);
