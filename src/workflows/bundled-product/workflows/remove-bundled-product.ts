import { Modules } from '@medusajs/framework/utils';
import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { dismissRemoteLinkStep, useQueryGraphStep } from '@medusajs/medusa/core-flows';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import { removeBundleStep } from '../steps/remove-bundle';
import { removeBundleItemsStep } from '../steps/remove-bundle-items';

export type RemoveBundledProductWorkflowInput = {
  id: string;
};

export const removeBundledProductWorkflow = createWorkflow(
  'remove-bundled-product',
  ({ id }: RemoveBundledProductWorkflowInput) => {
    const { data } = useQueryGraphStep({
      entity: 'bundle',
      fields: ['*', 'items.*', 'items.product.*'],
      filters: { id },
      options: { throwIfKeyNotFound: true },
    });

    const bundleProductLinks = transform({ bundleItems: data[0] }, (data) => {
      return data.bundleItems.items.map((item) => ({
        [BUNDLED_PRODUCT_MODULE]: { bundle_item_id: item?.id },
        [Modules.PRODUCT]: { product_id: item?.product?.id },
      }));
    });

    dismissRemoteLinkStep(bundleProductLinks);

    removeBundleItemsStep({ id });

    const bundleDeleted = removeBundleStep({ id });

    return new WorkflowResponse(bundleDeleted);
  },
);
