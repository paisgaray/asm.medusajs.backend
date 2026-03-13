import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { updateSubscriptionFrequencyStep } from './steps/update-subscription-frequency';

export type ChangeFrequencySubscriptionWorkflowInput = {
  id: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
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
