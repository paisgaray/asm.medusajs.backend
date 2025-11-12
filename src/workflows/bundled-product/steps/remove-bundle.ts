import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type RemoveBundledStepInput = {
  id: string;
};

export const removeBundleStep = createStep('remove-bundle', async ({ id }: RemoveBundledStepInput, { container }) => {
  const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

  await bundledProductModuleService.deleteBundles(id);

  return new StepResponse({
    id,
    object: 'bundled',
    deleted: true,
  });
});
