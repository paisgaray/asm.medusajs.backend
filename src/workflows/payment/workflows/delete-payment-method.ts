import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { deletePaymentMethodStep } from '../steps/delete-payment-method-step';

type DeletePaymentMethodWorkflowInput = {
  payment_method_id: string;
  account_holder_id: string;
};

export const deletePaymentMethodWorkflow = createWorkflow(
  'delete-payment-method',
  (input: DeletePaymentMethodWorkflowInput) => {
    const result = deletePaymentMethodStep({
      payment_method_id: input.payment_method_id,
      account_holder_id: input.account_holder_id,
    });

    return new WorkflowResponse(result);
  },
);
