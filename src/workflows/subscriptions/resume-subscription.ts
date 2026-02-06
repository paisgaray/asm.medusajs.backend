import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { resumeStripeSubscriptionStep } from './steps/resume-stripe-subscription';
import { updateSubscriptionStatusStep } from './steps/update-subscription-status';

type ResumeSubscriptionWorkflowInput = {
  subscription_id: string;
};

export const resumeSubscriptionWorkflow = createWorkflow(
  'resume-subscription',
  (input: ResumeSubscriptionWorkflowInput) => {
    // Step 1: Resume on Stripe
    const { status, resumed_at } = resumeStripeSubscriptionStep({
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
      resumed_at,
    });
  }
);
