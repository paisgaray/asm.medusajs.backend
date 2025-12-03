import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { syncProductsStep } from './steps/sync-products-step';

type SyncProductsInput = {
  limit?: number;
  offset?: number;
  filters?: {
    id?: string;
  };
};

export const syncProductsWorkflow = createWorkflow('sync-products', (input: SyncProductsInput) => {
  const result = syncProductsStep(input);
  return new WorkflowResponse(result);
});
