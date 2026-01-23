import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type RemoveBundledItemStepInput = {
  id: string;
  bundle_id: string;
};

export const removeBundleItemStep = createStep(
  'remove-bundle-item',
  async ({ id, bundle_id }: RemoveBundledItemStepInput, { container }) => {
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    await bundledProductModuleService.deleteBundleItems({ id, bundle_id });

    return new StepResponse({
      id,
      object: 'bundled_item',
      deleted: true,
    });
  },
);
