import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type RemoveBundleItemStepInput = {
  bundleItemId: string;
};

export const removeCustomBundleItemsStep = createStep(
  'remove-custom-bundle-items',
  async ({ bundleItemId }: RemoveBundleItemStepInput, { container }) => {
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    await bundledProductModuleService.softDeleteCustomItems({ id: bundleItemId });

    return new StepResponse({
      bundleItemId,
      object: 'bundled_item',
      deleted: true,
    });
  },
);
