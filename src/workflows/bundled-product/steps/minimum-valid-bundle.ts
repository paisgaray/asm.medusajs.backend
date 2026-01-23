import { IProductModuleService } from '@medusajs/framework/types';
import { MedusaError, Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type Input = {
  bundle_id?: string;
  bundledProductItems?: {
    product_id: string;
    details: string;
    quantity: number;
  }[];
};

export const minimumValidBundle = createStep('minimum-valid-bundle-step', async (input: Input, { container }) => {
  const productModuleService: IProductModuleService = container.resolve(Modules.PRODUCT);

  if (input.bundledProductItems?.length) {
    if (input.bundledProductItems.length < 2) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'The minimum number of bundled products together must be 2.',
      );
    }

    for (const bundledProductItem of input.bundledProductItems) {
      const productExists = await productModuleService.listProducts({ id: bundledProductItem.product_id });

      if (!productExists.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `The product with id ${bundledProductItem.product_id} does not exist.`,
        );
      }
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
