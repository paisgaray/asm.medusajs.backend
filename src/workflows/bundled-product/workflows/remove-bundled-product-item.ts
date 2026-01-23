import { Modules } from '@medusajs/framework/utils';
import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { dismissRemoteLinkStep, useQueryGraphStep } from '@medusajs/medusa/core-flows';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import { minimumValidBundle } from '../steps/minimum-valid-bundle';
import { removeBundleItemStep } from '../steps/remove-bundle-item';

export type RemoveBundledProductItemWorkflowInput = {
  id: string;
  bundle_id: string;
};

export const removeBundledProductItemWorkflow = createWorkflow(
  'remove-bundled-product-item',
  ({ id, bundle_id }: RemoveBundledProductItemWorkflowInput) => {
    minimumValidBundle({ bundle_id });

    const { data } = useQueryGraphStep({
      entity: 'bundle_item',
      fields: ['id', 'product.*'],
      filters: { id },
      options: { throwIfKeyNotFound: true },
    });

    dismissRemoteLinkStep({
      [BUNDLED_PRODUCT_MODULE]: { bundle_item_id: data[0].id },
      [Modules.PRODUCT]: { product_id: data[0]?.product?.id },
    });

    const bundleItemDeleted = removeBundleItemStep({ id, bundle_id });

    return new WorkflowResponse(bundleItemDeleted);
  },
);
