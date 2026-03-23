import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { skipProviderSubscriptionStep } from './steps/skip-provider-subscription';
import { updateSubscriptionNextBillingStep } from './steps/update-subscription-next-billing';
import { validateAndComputeSkipStep } from './steps/validate-and-compute-skip';

type SkipSubscriptionWorkflowInput = {
  subscription_id: string;
};

export const skipSubscriptionWorkflow = createWorkflow('skip-subscription', (input: SkipSubscriptionWorkflowInput) => {
  // Step 1: Validate subscription and compute new billing date (provider-agnostic)
  const { provider, provider_subscription_id, new_next_billing_date } = validateAndComputeSkipStep({
    subscription_id: input.subscription_id,
  });

  // Step 2: Skip on the payment provider (adapter pattern)
  skipProviderSubscriptionStep({
    provider,
    provider_subscription_id,
    new_next_billing_date,
  });

  // Step 3: Update local database
  updateSubscriptionNextBillingStep({
    subscription_id: input.subscription_id,
    next_billing_date: new_next_billing_date,
  });

  return new WorkflowResponse({
    subscription_id: input.subscription_id,
    next_billing_date: new_next_billing_date,
  });
});
