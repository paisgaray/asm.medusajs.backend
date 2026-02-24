import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type CreateCustomBundleStepInput = {
  subscription_id: string;
  bundle_price: number;
  metadata: Record<string, unknown>;
};

export const createCustomBundleStep = createStep(
  'create-custom-bundle',
  async (input: CreateCustomBundleStepInput, { container }) => {
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    const customBundle = await subscriptionService.createCustomBundles({
      subscription_id: input.subscription_id,
      bundle_price: input.bundle_price,
      metadata: input.metadata,
    });

    return new StepResponse(customBundle, {
      custom_bundle_id: customBundle.id,
    });
  },
  async (data, { container }) => {
    if (!data?.custom_bundle_id) {
      return;
    }

    // Rollback: delete the custom bundle record
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);
    await subscriptionService.deleteCustomBundles([data.custom_bundle_id]);
  },
);
