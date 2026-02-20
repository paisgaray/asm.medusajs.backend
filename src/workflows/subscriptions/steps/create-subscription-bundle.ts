import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type CreateSubscriptionBundleStepInput = {
  subscription_id: string;
  bundle_price: number;
  metadata: Record<string, unknown>;
};

export const createSubscriptionBundleStep = createStep(
  'create-subscription-bundle',
  async (input: CreateSubscriptionBundleStepInput, { container }) => {
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    const subscriptionBundle = await subscriptionService.createSubscriptionBundles({
      subscription_id: input.subscription_id,
      bundle_price: input.bundle_price,
      metadata: input.metadata,
    });

    return new StepResponse(subscriptionBundle, {
      subscription_bundle_id: subscriptionBundle.id,
    });
  },
  async (data, { container }) => {
    if (!data?.subscription_bundle_id) {
      return;
    }

    // Rollback: delete the subscription bundle record
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);
    await subscriptionService.deleteSubscriptionBundles([data.subscription_bundle_id]);
  },
);
