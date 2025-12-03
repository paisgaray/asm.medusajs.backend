import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { searchProductsStep } from './steps/search-products-step';

type SearchProductsInput = {
  query: string;
};

export const searchProductsWorkflow = createWorkflow('search-products', (input: SearchProductsInput) => {
  const results = searchProductsStep(input);
  return new WorkflowResponse({ products: results });
});
