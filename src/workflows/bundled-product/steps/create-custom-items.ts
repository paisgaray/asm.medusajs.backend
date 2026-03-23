import { InferTypeOf } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import { CustomItem } from '../../../modules/bundled-product/models/custom-item';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type CreateBundleItemsStepInput = {
  custom_bundle_id: string;
  items: {
    product_id: string;
  }[];
};

export const createCustomBundleItemsStep = createStep(
  'create-custom-bundle-items',
  async ({ custom_bundle_id, items }: CreateBundleItemsStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const customItems: InferTypeOf<typeof CustomItem>[] = [];

    for (const item of items) {
      const {
        data: [newProduct],
      } = await query.graph({
        entity: 'product',
        filters: { id: item.product_id },
        fields: ['*', 'variants.*', 'variants.prices.*', 'variants.options.*', 'variants.options.option.*'],
      });

      const [createCustomItems] = await bundledProductModuleService.createCustomItems([
        { type: 'bundle', custom_bundle_id, product_snapshot: { ...newProduct } },
      ]);

      customItems.push(createCustomItems);
    }

    return new StepResponse(
      customItems,
      customItems.map((item) => item.id),
    );
  },
  async (itemIds, { container }) => {
    if (!itemIds?.length) return;

    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    await bundledProductModuleService.deleteCustomItems(itemIds);
  },
);
