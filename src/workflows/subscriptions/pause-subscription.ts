import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { pauseStripeSubscriptionStep } from './steps/pause-stripe-subscription';
import { updateSubscriptionStatusStep } from './steps/update-subscription-status';

type PauseSubscriptionWorkflowInput = {
  subscription_id: string;
};

export const pauseSubscriptionWorkflow = createWorkflow(
  'pause-subscription',
  (input: PauseSubscriptionWorkflowInput) => {
    // Step 1: Pause on Stripe
    const { status, paused_at } = pauseStripeSubscriptionStep({
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
      paused_at,
    });
  }
);
