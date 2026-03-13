import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type UpdateSubscriptionProgramationStepInput = {
  id: string;
  delivery_date: Date;
  period: 'morning' | 'afternoon' | 'evening';
};

export const updateSubscriptionProgramationStep = createStep(
  'update-subscription-programation',
  async (input: UpdateSubscriptionProgramationStepInput, { container }) => {
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    const subscription = await subscriptionService.updateSubscriptions(input);

    return new StepResponse({ subscription });
  },
);
