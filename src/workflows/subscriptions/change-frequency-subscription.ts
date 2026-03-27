import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SubscriptionFrequency } from '../../modules/subscriptions';
import { updateSubscriptionFrequencyStep } from './steps/update-subscription-frequency';

export type ChangeFrequencySubscriptionWorkflowInput = {
  id: string;
  frequency: SubscriptionFrequency;
};

export const changeFrequencySubscriptionWorkflow = createWorkflow(
  'change-frequency-subscription',
  (input: ChangeFrequencySubscriptionWorkflowInput) => {
    updateSubscriptionFrequencyStep(input);

    return new WorkflowResponse({
      subscription_id: input.id,
    });
  },
);
