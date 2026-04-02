import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { updateSubscriptionPaymentMethodStep } from './steps/update-subscription-payment-method';

export type UpdateSubscriptionPaymentMethodWorkflowInput = {
  id: string;
  payment_method_id: string;
  set_as_default: boolean;
};

export const updateSubscriptionPaymentMethodWorkflow = createWorkflow(
  'update-subscription-payment-method',
  (input: UpdateSubscriptionPaymentMethodWorkflowInput) => {
    const result = updateSubscriptionPaymentMethodStep(input);

    return new WorkflowResponse({
      subscription_id: input.id,
      payment_method: result,
    });
  },
);
