import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';

type CreateBundleProductLinkInput = {
  custom_bundle_id: string;
  product_id: string;
};

export const createBundleProductLinkStep = createStep(
  'create-bundle-product-link',
  async (input: CreateBundleProductLinkInput, { container }) => {
    const remoteLink = container.resolve('remoteLink');

    await remoteLink.create({
      [BUNDLED_PRODUCT_MODULE]: {
        custom_bundle_id: input.custom_bundle_id,
      },
      [Modules.PRODUCT]: {
        product_id: input.product_id,
      },
    });

    return new StepResponse(
      { custom_bundle_id: input.custom_bundle_id, product_id: input.product_id },
      { custom_bundle_id: input.custom_bundle_id, product_id: input.product_id },
    );
  },
  async (data, { container }) => {
    if (!data) return;

    const remoteLink = container.resolve('remoteLink');

    await remoteLink.dismiss({
      [BUNDLED_PRODUCT_MODULE]: {
        custom_bundle_id: data.custom_bundle_id,
      },
      [Modules.PRODUCT]: {
        product_id: data.product_id,
      },
    });
  },
);
