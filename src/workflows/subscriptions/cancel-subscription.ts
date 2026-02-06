import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { cancelStripeSubscriptionStep } from './steps/cancel-stripe-subscription';
import { updateSubscriptionStatusStep } from './steps/update-subscription-status';

type CancelSubscriptionWorkflowInput = {
  subscription_id: string;
};

export const cancelSubscriptionWorkflow = createWorkflow(
  'cancel-subscription',
  (input: CancelSubscriptionWorkflowInput) => {
    // Step 1: Cancel on Stripe
    const { status, cancelled_at } = cancelStripeSubscriptionStep({
      subscription_id: input.subscription_id,
    });

    // Step 2: Update local database
    updateSubscriptionStatusStep({
      subscription_id: input.subscription_id,
      status,
    });

    return new WorkflowResponse({
      subscription_id: input.subscription_id,
      status,
      cancelled_at,
    });
  }
);
