import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { updateBundleStep } from '../steps/update-bundle';

export type UpdateBundledProductWorkflowInput = {
  id: string;
  title: string;
  details: string;
};

export const updateBundledProductWorkflow = createWorkflow(
  'update-bundled-product',
  (data: UpdateBundledProductWorkflowInput) => {
    const bundledUpdated = updateBundleStep(data);

    return new WorkflowResponse(bundledUpdated);
  },
);
