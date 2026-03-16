import { Modules } from '@medusajs/framework/utils';
import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { createRemoteLinkStep, updateProductsWorkflow, useQueryGraphStep } from '@medusajs/medusa/core-flows';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import { createBundleStep } from '../steps/create-bundle';
import { createBundleItemsStep } from '../steps/create-bundle-items';
import { minimumValidBundle } from '../steps/minimum-valid-bundle';

export type CreateBundledProductWorkflowInput = {
  bundle: {
    product_id: string;
    items: {
      product_id: string;
      details: string;
    }[];
  };
};

export const createBundledProductWorkflow = createWorkflow(
  'create-bundled-product',
  ({ bundle: bundleData }: CreateBundledProductWorkflowInput) => {
    minimumValidBundle({ items: bundleData.items });

    const bundle = createBundleStep();

    const bundleItems = createBundleItemsStep({ bundle_id: bundle.id, items: bundleData.items });

    const bundleProduct = updateProductsWorkflow.runAsStep({
      input: { products: [{ id: bundleData.product_id, metadata: { bundle_id: bundle.id } }] },
    });

    createRemoteLinkStep([
      {
        [BUNDLED_PRODUCT_MODULE]: { bundle_id: bundle.id },
        [Modules.PRODUCT]: { product_id: bundleProduct[0].id },
      },
    ]);

    const bundleProductLinks = transform({ bundleData, bundleItems }, (data) => {
      return data.bundleItems.map((item, index) => ({
        [BUNDLED_PRODUCT_MODULE]: { bundle_item_id: item.id },
        [Modules.PRODUCT]: { product_id: data.bundleData.items[index].product_id },
      }));
    });

    createRemoteLinkStep(bundleProductLinks).config({
      name: 'create-bundle-product-items-links',
    });

    const { data } = useQueryGraphStep({
      entity: 'bundle',
      fields: ['*', 'items.*'],
      filters: { id: bundle.id },
    });

    return new WorkflowResponse(data[0]);
  },
);
