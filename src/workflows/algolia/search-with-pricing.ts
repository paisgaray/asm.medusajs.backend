import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { hydrateProductsWithPricingStep } from './steps/hydrate-products-with-pricing-step';
import { searchProductsStep } from './steps/search-products-step';
import { validateRegionStep } from './steps/validate-region-step';
import { Product } from './types';

interface SearchWithPricingInput {
  searchQuery: string;
  filters?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  language?: string;
  region_id?: string;
  currency_code?: string;
}

interface SearchWithPricingOutput {
  products: Product[];
  total: number;
  page: number;
  nbHits: number;
  nbPages: number;
  query: string;
}

export const searchProductsWithPricingWorkflow = createWorkflow(
  'search-products-with-pricing',
  (input: SearchWithPricingInput): WorkflowResponse<SearchWithPricingOutput> => {
    const { region_id, currency_code } = validateRegionStep({
      region_id: input.region_id,
      currency_code: input.currency_code,
    });

    const searchResults = searchProductsStep({
      searchQuery: input.searchQuery,
      filters: input.filters || '',
      page: input.page || 0,
      limit: input.limit || 20,
      sortBy: input.sortBy,
      language: input.language || 'es',
    });

    const { products } = hydrateProductsWithPricingStep({
      hits: searchResults.hits,
      region_id,
      currency_code,
    });

    return new WorkflowResponse({
      products,
      total: searchResults.total,
      page: searchResults.page,
      nbHits: searchResults.nbHits,
      nbPages: searchResults.nbPages,
      query: input.searchQuery,
    });
  },
);
