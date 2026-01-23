import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type UpdateBundleItemsStepInput = {
  id: string;
  bundle_id: string;
  details: string;
  quantity: number;
};

export const updateBundleItemsStep = createStep(
  'update-bundle-items',
  async (input: UpdateBundleItemsStepInput, { container }) => {
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const bundle = await bundledProductModuleService.listBundleItems({ id: input.id, bundle_id: input.bundle_id });

    const bundleItemsUpdated = await bundledProductModuleService.updateBundleItems(input);

    const { id, details, quantity } = bundle[0];

    return new StepResponse(bundleItemsUpdated, { id, details, quantity });
  },
  async (data, { container }) => {
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    await bundledProductModuleService.updateBundleItems(data);
  },
);
