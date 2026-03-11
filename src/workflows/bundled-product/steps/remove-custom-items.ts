import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type RemoveBundleItemStepInput = {
  custom_item_id: string;
};

export const removeCustomBundleItemsStep = createStep(
  'remove-custom-bundle-items',
  async ({ custom_item_id }: RemoveBundleItemStepInput, { container }) => {
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    await bundledProductModuleService.softDeleteCustomItems({ id: custom_item_id });

    return new StepResponse({
      custom_item_id,
      object: 'custom_item',
      deleted: true,
    });
  },
);
