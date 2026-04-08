import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';

type CreateSubscriptionBundleLinkInput = {
  subscription_id: string;
  custom_bundle_id: string;
};

export const createSubscriptionBundleLinkStep = createStep(
  'create-subscription-bundle-link',
  async (input: CreateSubscriptionBundleLinkInput, { container }) => {
    const remoteLink = container.resolve('remoteLink');

    await remoteLink.create({
      [SUBSCRIPTION_MODULE]: { subscription_id: input.subscription_id },
      [BUNDLED_PRODUCT_MODULE]: { custom_bundle_id: input.custom_bundle_id },
    });

    return new StepResponse(
      { subscription_id: input.subscription_id, custom_bundle_id: input.custom_bundle_id },
      { subscription_id: input.subscription_id, custom_bundle_id: input.custom_bundle_id },
    );
  },
  async (data, { container }) => {
    if (!data) return;

    const remoteLink = container.resolve('remoteLink');

    await remoteLink.dismiss({
      [SUBSCRIPTION_MODULE]: { subscription_id: data.subscription_id },
      [BUNDLED_PRODUCT_MODULE]: { custom_bundle_id: data.custom_bundle_id },
    });
  },
);
