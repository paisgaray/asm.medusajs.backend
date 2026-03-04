import { InferTypeOf } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import { CustomItem } from '../../../modules/bundled-product/models/custom-item';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type CreateBundleItemsStepInput = {
  customBundle_id: string;
  items: {
    bundleItemId: string;
    product_id: string;
  }[];
};

export const createCustomBundleItemsStep = createStep(
  'create-custom-bundle-items',
  async ({ customBundle_id, items }: CreateBundleItemsStepInput, { container }) => {
    // const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const productModuleService = container.resolve(Modules.PRODUCT);
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    let customItems: InferTypeOf<typeof CustomItem>[] = null;

    for (const item of items) {
      const [newProduct] = await productModuleService.listProducts({ id: item.product_id });

      customItems = await bundledProductModuleService.createCustomItems([
        { type: 'bundle', customBundle_id, product_snapshot: { ...newProduct } },
      ]);
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
