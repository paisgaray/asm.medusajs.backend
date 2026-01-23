import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';
import { CreateBundleStepInput } from './create-bundle';

type UpdateBundleStepInput = CreateBundleStepInput & {
  id: string;
};

export const updateBundleStep = createStep(
  'update-bundle',
  async (data: UpdateBundleStepInput, { container }) => {
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const bundle = await bundledProductModuleService.listBundles({ id: data.id });

    const bundleUpdated = await bundledProductModuleService.updateBundles(data);

    const { id, title, details } = bundle[0];

    return new StepResponse(bundleUpdated, { id, title, details });
  },
  async (data, { container }) => {
    if (!data.id) return;

    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    await bundledProductModuleService.updateBundles(data);
  },
);
