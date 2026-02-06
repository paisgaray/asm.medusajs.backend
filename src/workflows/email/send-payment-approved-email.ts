import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SENDGRID_TEMPLATES } from '../../constants/sendgrid-templates';
import { formatOrderStep } from './steps/format-order-step';
import { GetOrderByPaymentIdOutput, getOrderByPaymentIdStep } from './steps/get-order-by-paymentId-step';
import { sendEmailStep } from './steps/send-email-step';

export interface SendPaymentApprovedEmailInput {
  payment_id: string;
}

export const sendPaymentApprovedEmailWorkflow = createWorkflow(
  'send-payment-approved-email',
  (input: SendPaymentApprovedEmailInput) => {
    const { order, payment } = getOrderByPaymentIdStep({ payment_id: input.payment_id }) as GetOrderByPaymentIdOutput;

    const { templateData, recipientEmail } = formatOrderStep({ order, payment });

    const result = sendEmailStep({
      templateId: SENDGRID_TEMPLATES.PAYMENT_APPROVED,
      recipientEmail,
      templateData,
    });

    return new WorkflowResponse(result);
  },
);
