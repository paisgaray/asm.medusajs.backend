import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { ensureAccountHolderStep } from '../steps/ensure-account-holder-step';
import { savePaymentMethodStep } from '../steps/save-payment-method-step';

type CreatePaymentMethodWorkflowInput = {
  customer_id: string;
  provider_id: string;
  payment_method_id: string;
  metadata?: Record<string, unknown>;
};

export const createPaymentMethodWorkflow = createWorkflow(
  'create-payment-method',
  (input: CreatePaymentMethodWorkflowInput) => {
    const accountHolder = ensureAccountHolderStep({
      customer_id: input.customer_id,
      provider_id: input.provider_id,
    });

    const savedMethod = savePaymentMethodStep({
      account_holder: accountHolder,
      payment_method_id: input.payment_method_id,
      metadata: input.metadata,
    });

    return new WorkflowResponse({
      payment_method: savedMethod,
      account_holder_id: accountHolder.id,
    });
  },
);
