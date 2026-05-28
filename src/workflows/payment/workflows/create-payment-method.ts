import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { ensureAccountHolderStep } from '../steps/ensure-account-holder-step';
import { persistPaymentMethodStep } from '../steps/persist-payment-method-step';
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

    const saveResult = savePaymentMethodStep({
      customer_id: input.customer_id,
      account_holder: accountHolder,
      payment_method_id: input.payment_method_id,
      metadata: input.metadata,
    });

    persistPaymentMethodStep({
      account_holder: accountHolder,
      payment_method_id: input.payment_method_id,
      payment_method_data: saveResult.providerData as Record<string, unknown>,
    });

    return new WorkflowResponse({
      payment_method: saveResult.savedMethod,
      account_holder_id: accountHolder.id,
    });
  },
);
