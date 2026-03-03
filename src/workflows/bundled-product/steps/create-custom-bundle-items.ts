import { ContainerRegistrationKeys, Modules, QueryContext } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import BundledProductModuleService from '../../../modules/bundled-product/service';

type CreateBundleItemsStepInput = {
  currency_code: string;
  custom_bundle_id: string;
  items: {
    bundleItemId: string;
    product_id: string;
  }[];
};

export const createCustomBundleItemsStep = createStep(
  'create-custom-bundle-items',
  async ({ currency_code, custom_bundle_id, items }: CreateBundleItemsStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const productModuleService = container.resolve(Modules.PRODUCT);
    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    const itensToBeCreate = [];

    for (const item of items) {
      const {
        data: [bundledItem],
      } = await query.graph({
        entity: 'bundle_item',
        filters: { id: item.bundleItemId },
        fields: ['*', 'product.*', 'product.variants.*', 'product.variants.calculated_price.*'],
        context: { product: { variants: { calculated_price: QueryContext({ currency_code }) } } },
      });

      const [newProduct] = await productModuleService.listProducts({ id: item.product_id });

      itensToBeCreate.push({
        type: 'bundle',
        custom_bundle_id,
        quantity: bundledItem.quantity,
        item_price: bundledItem?.product?.variants?.[0]?.calculated_price?.calculated_amount || 0,
        product_snapshot: newProduct,
      });
    }

    const customBundleItems = await bundledProductModuleService.createCustomBundleItems(itensToBeCreate);

    return new StepResponse(
      customBundleItems,
      customBundleItems.map((item) => item.id),
    );
  },
  async (itemIds, { container }) => {
    if (!itemIds?.length) return;

    const bundledProductModuleService: BundledProductModuleService = container.resolve(BUNDLED_PRODUCT_MODULE);

    await bundledProductModuleService.deleteCustomBundleItems(itemIds);
  },
);
