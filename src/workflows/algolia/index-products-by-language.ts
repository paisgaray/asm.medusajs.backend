import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { syncProductsStep } from './steps/sync-products-step';

type IndexProductsByLanguageInput = {
  language: string;
  limit?: number;
  offset?: number;
};

export const indexProductsByLanguageWorkflow = createWorkflow(
  'index-products-by-language',
  (input: IndexProductsByLanguageInput) => {
    const result = syncProductsStep({
      limit: input.limit,
      offset: input.offset,
    });
    return new WorkflowResponse(result);
  },
);
