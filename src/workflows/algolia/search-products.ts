import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { searchProductsStep } from './steps/search-products-step';

type SearchProductsInput = {
  query: string;
  filters?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  language?: string;
};

export const searchProductsWorkflow = createWorkflow('search-products', (input: SearchProductsInput) => {
  const results = searchProductsStep({
    searchQuery: input.query,
    filters: input.filters,
    page: input.page,
    limit: input.limit,
    sortBy: input.sortBy,
    language: input.language,
  });
  return new WorkflowResponse(results);
});
