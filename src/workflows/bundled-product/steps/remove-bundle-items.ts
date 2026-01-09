import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type RemoveBundledItemsStepInput = {
  id: string;
};

export const removeBundleItemsStep = createStep(
  'remove-bundle-items',
  async ({ id }: RemoveBundledItemsStepInput, { container }) => {
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    await bundledProductModuleService.softDeleteBundleItems({ bundle_id: id });

    return new StepResponse({
      bundle_id: id,
      object: 'bundled_item',
      deleted: true,
    });
  },
);
