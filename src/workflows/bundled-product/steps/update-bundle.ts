import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type UpdateBundleStepInput = {
  id: string;
};

export const updateBundleStep = createStep(
  'update-bundle',
  async (data: UpdateBundleStepInput, { container }) => {
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const bundle = await bundledProductModuleService.listBundles({ id: data.id });

    const bundleUpdated = await bundledProductModuleService.updateBundles(data);

    const { id } = bundle[0];

    return new StepResponse(bundleUpdated, { id });
  },
  async (data, { container }) => {
    if (!data.id) return;

    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    await bundledProductModuleService.updateBundles(data);
  },
);
