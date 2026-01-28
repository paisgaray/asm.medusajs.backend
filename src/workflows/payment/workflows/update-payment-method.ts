import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { updatePaymentMethodStep } from '../steps/update-payment-method-step';

type UpdatePaymentMethodWorkflowInput = {
  payment_method_id: string;
  account_holder_id: string;
  metadata?: Record<string, unknown>;
};

export const updatePaymentMethodWorkflow = createWorkflow(
  'update-payment-method',
  (input: UpdatePaymentMethodWorkflowInput) => {
    const result = updatePaymentMethodStep({
      payment_method_id: input.payment_method_id,
      account_holder_id: input.account_holder_id,
      metadata: input.metadata,
    });

    return new WorkflowResponse(result);
  },
);
