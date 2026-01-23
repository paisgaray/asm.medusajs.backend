import { Modules } from '@medusajs/framework/utils';
import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { createRemoteLinkStep, useQueryGraphStep } from '@medusajs/medusa/core-flows';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import { createBundleItemsStep } from '../steps/create-bundle-items';

export type AddBundledProductItemWorkflowInput = {
  bundle_id: string;
  item: {
    product_id: string;
    details: string;
    quantity: number;
  };
};

export const addBundledProductItemWorkflow = createWorkflow(
  'add-bundled-product-item',
  ({ bundle_id, item }: AddBundledProductItemWorkflowInput) => {
    const bundleItem = createBundleItemsStep({ bundle_id, items: [item] });

    createRemoteLinkStep([
      {
        [BUNDLED_PRODUCT_MODULE]: { bundle_item_id: bundleItem[0].id },
        [Modules.PRODUCT]: { product_id: item.product_id },
      },
    ]);

    const { data } = useQueryGraphStep({
      entity: 'bundle',
      fields: ['*', 'items.*'],
      filters: { id: bundle_id },
    });

    return new WorkflowResponse(data[0]);
  },
);
