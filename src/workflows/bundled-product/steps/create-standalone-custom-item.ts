import { InferTypeOf } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import { CustomItem } from '../../../modules/bundled-product/models/custom-item';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type Input = {
  items: { product_id: string; quantity?: number; item_price?: number }[];
};

export const createStandaloneCustomItemsStep = createStep(
  'create-standalone-custom-items',
  async ({ items }: Input, { container }) => {
    const productModuleService = container.resolve(Modules.PRODUCT);
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const customItems: InferTypeOf<typeof CustomItem>[] = [];

    for (const item of items) {
      const [product] = await productModuleService.listProducts({ id: item.product_id });

      if (!product) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      const [customItem] = await bundledProductModuleService.createCustomItems([
        {
          type: 'single',
          quantity: item.quantity ?? 1,
          item_price: item.item_price ?? 0,
          product_snapshot: { ...product },
        },
      ]);

      customItems.push(customItem);
    }

    return new StepResponse(
      customItems,
      customItems.map((i) => i.id),
    );
  },
  async (itemIds, { container }) => {
    if (!itemIds?.length) return;

    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);
    await bundledProductModuleService.deleteCustomItems(itemIds);
  },
);
