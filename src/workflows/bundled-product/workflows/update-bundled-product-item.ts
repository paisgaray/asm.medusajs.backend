import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { updateBundleItemsStep } from '../steps/update-bundle-items';

export type UpdateBundledProductItemWorkflowInput = {
  id: string;
  bundle_id: string;
  details: string;
  quantity: number;
};

export const updateBundledProductItemWorkflow = createWorkflow(
  'update-bundled-product-item',
  (data: UpdateBundledProductItemWorkflowInput) => {
    const bundledItemUpdated = updateBundleItemsStep(data);

    return new WorkflowResponse(bundledItemUpdated);
  },
);
