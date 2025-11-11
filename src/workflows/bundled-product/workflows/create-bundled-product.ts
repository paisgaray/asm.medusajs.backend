import { CreateProductWorkflowInputDTO } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { createProductsWorkflow, createRemoteLinkStep, useQueryGraphStep } from '@medusajs/medusa/core-flows';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import { createBundleStep } from '../steps/create-bundle';
import { createBundleItemsStep } from '../steps/create-bundle-items';

export type CreateBundledProductWorkflowInput = {
  bundle: {
    title: string;
    details: string;
    product: CreateProductWorkflowInputDTO;
    items: {
      product_id: string;
      details: string;
      quantity: number;
    }[];
  };
};

export const createBundledProductWorkflow = createWorkflow(
  'create-bundled-product',
  ({ bundle: bundleData }: CreateBundledProductWorkflowInput) => {
    const bundle = createBundleStep({ title: bundleData.title, details: bundleData.details });

    const bundleItems = createBundleItemsStep({ bundle_id: bundle.id, items: bundleData.items });

    const bundleProduct = createProductsWorkflow.runAsStep({ input: { products: [bundleData.product] } });

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
      filters: {
        id: bundle.id,
      },
    });

    return new WorkflowResponse(data[0]);
  },
);
