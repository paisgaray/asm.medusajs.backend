import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { ensureAccountHolderStep } from '../steps/ensure-account-holder-step';

type EnsureAccountHolderWorkflowInput = {
  customer_id: string;
  provider_id: string;
};

export const ensureAccountHolderWorkflow = createWorkflow(
  'ensure-account-holder',
  (input: EnsureAccountHolderWorkflowInput) => {
    const accountHolder = ensureAccountHolderStep({
      customer_id: input.customer_id,
      provider_id: input.provider_id,
    });

    return new WorkflowResponse({
      account_holder: accountHolder,
    });
  },
);
