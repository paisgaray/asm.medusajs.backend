import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type UpdateSubscriptionFrequencyStepInput = {
  id: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
};

export const updateSubscriptionFrequencyStep = createStep(
  'update-subscription-frequency',
  async (input: UpdateSubscriptionFrequencyStepInput, { container }) => {
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    const subscription = await subscriptionService.updateSubscriptions(input);

    // TODO: add aqui logica para atualizar frequencia no Stripe

    return new StepResponse({ subscription });
  },
);
