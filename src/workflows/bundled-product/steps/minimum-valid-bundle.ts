import { MedusaError } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type Input = {
  bundle_id?: string;
  bundledProductItems?: {
    details: string;
    quantity: number;
  }[];
};

export const minimumValidBundle = createStep('minimum-valid-bundle-step', async (input: Input, { container }) => {
  if (input.bundledProductItems?.length) {
    if (input.bundledProductItems.length < 2) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'The minimum number of bundled products together must be 2.',
      );
    }

    return new StepResponse();
  }

  const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

  const bundledProducts = await bundledProductModuleService.listBundles(
    { id: input.bundle_id },
    { relations: ['items'] },
  );

  const bundledProduct = bundledProducts[0];

  if (bundledProduct?.items.length <= 2) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, 'The minimum number of bundled products together must be 2.');
  }

  return new StepResponse();
});
