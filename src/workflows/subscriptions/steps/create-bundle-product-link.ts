import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';

type CreateBundleProductLinkInput = {
  subscription_bundle_id: string;
  product_id: string;
};

export const createBundleProductLinkStep = createStep(
  'create-bundle-product-link',
  async (input: CreateBundleProductLinkInput, { container }) => {
    const remoteLink = container.resolve('remoteLink');

    await remoteLink.create({
      [SUBSCRIPTION_MODULE]: {
        subscription_bundle_id: input.subscription_bundle_id,
      },
      [Modules.PRODUCT]: {
        product_id: input.product_id,
      },
    });

    return new StepResponse(
      { subscription_bundle_id: input.subscription_bundle_id, product_id: input.product_id },
      { subscription_bundle_id: input.subscription_bundle_id, product_id: input.product_id },
    );
  },
  async (data, { container }) => {
    if (!data) return;

    const remoteLink = container.resolve('remoteLink');

    await remoteLink.dismiss({
      [SUBSCRIPTION_MODULE]: {
        subscription_bundle_id: data.subscription_bundle_id,
      },
      [Modules.PRODUCT]: {
        product_id: data.product_id,
      },
    });
  },
);
