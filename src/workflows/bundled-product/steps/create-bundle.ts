import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

export const createBundleStep = createStep(
  'create-bundle',
  async (_, { container }) => {
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const bundle = await bundledProductModuleService.createBundles({});

    return new StepResponse(bundle, bundle.id);
  },
  async (bundleId, { container }) => {
    if (!bundleId) return;

    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    await bundledProductModuleService.deleteBundles(bundleId);
  },
);
