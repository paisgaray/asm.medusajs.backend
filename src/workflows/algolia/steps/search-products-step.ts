import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { ALGOLIA_MODULE } from '../../../modules/algolia';
import AlgoliaModuleService from '../../../modules/algolia/service';

type SearchProductsStepInput = {
  query: string;
};

export const searchProductsStep = createStep(
  'search-products-step',
  async (input: SearchProductsStepInput, { container }) => {
    try {
      let algoliaService: AlgoliaModuleService;
      
      try {
        algoliaService = container.resolve(ALGOLIA_MODULE);
      } catch (resolveError) {
        console.error('Failed to resolve Algolia module:', resolveError);
        throw new Error(`Algolia module not found. Make sure it's registered in medusa-config.ts. Error: ${resolveError instanceof Error ? resolveError.message : 'Unknown error'}`);
      }

      if (!algoliaService) {
        throw new Error('Algolia service is undefined');
      }

      const result = await algoliaService.search(input.query, 'product');
      
      // Process result according to Algolia API v5 response structure
      if (!result || !result.results || result.results.length === 0) {
        return new StepResponse([]);
      }

      const firstResult = result.results[0];
      
      if (!firstResult || !('hits' in firstResult)) {
        return new StepResponse([]);
      }

      const hits = Array.isArray(firstResult.hits) ? firstResult.hits : [];

      return new StepResponse(hits);
    } catch (error) {
      console.error('Error in searchProductsStep:', error);
      throw error;
    }
  },
);

