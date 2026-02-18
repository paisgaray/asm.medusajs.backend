import { Modules } from '@medusajs/framework/utils';
import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { createRemoteLinkStep, removeRemoteLinkStep, updateProductsWorkflow } from '@medusajs/medusa/core-flows';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import { updateBundleStep } from '../steps/update-bundle';

export type UpdateBundledProductWorkflowInput = {
  id: string;
  product_id: string;
};

export const updateBundledProductWorkflow = createWorkflow(
  'update-bundled-product',
  (data: UpdateBundledProductWorkflowInput) => {
    const bundledUpdated = updateBundleStep(data);

    const product = updateProductsWorkflow.runAsStep({
      input: {
        products: [
          {
            id: data.product_id,
            metadata: { bundle_id: bundledUpdated.id },
          },
        ],
      },
    });

    removeRemoteLinkStep([{ [BUNDLED_PRODUCT_MODULE]: { bundle_id: bundledUpdated.id } }]);

    createRemoteLinkStep([
      {
        [BUNDLED_PRODUCT_MODULE]: { bundle_id: bundledUpdated.id },
        [Modules.PRODUCT]: { product_id: product[0].id },
      },
    ]);

    return new WorkflowResponse(bundledUpdated);
  },
);
