import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type Input = {
  product_id: string;
};

export const createStandaloneCustomItemStep = createStep(
  'create-standalone-custom-item',
  async ({ product_id }: Input, { container }) => {
    const productModuleService = container.resolve(Modules.PRODUCT);
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const [product] = await productModuleService.listProducts({ id: product_id });

    if (!product) {
      throw new Error(`Product ${product_id} not found`);
    }

    const [customItem] = await bundledProductModuleService.createCustomItems([
      { type: 'single', product_snapshot: { ...product } },
    ]);

    return new StepResponse(customItem, customItem.id);
  },
  async (customItemId, { container }) => {
    if (!customItemId) return;

    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);
    await bundledProductModuleService.deleteCustomItems(customItemId);
  },
);
