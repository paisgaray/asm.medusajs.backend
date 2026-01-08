import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { ALGOLIA_MODULE, type AlgoliaSearchHit } from '../../../modules/algolia';
import AlgoliaModuleService from '../../../modules/algolia/service';

type SearchProductsStepInput = {
  query: string;
  filters?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  language?: string;
};

export const searchProductsStep = createStep(
  'search-products-step',
  async (input: SearchProductsStepInput, { container }) => {
    try {
      const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);

      const page = input.page ?? 0;
      const limit = input.limit ?? 20;
      const validatedLanguage = algoliaService.validateLanguage(input.language);

      const result = await algoliaService.searchProducts(
        input.query,
        input.filters || '',
        page,
        limit,
        input.sortBy,
        validatedLanguage,
      );

      if (!result?.results?.[0]) {
        return new StepResponse<{
          products: AlgoliaSearchHit[];
          total: number;
          page: number;
          nbHits: number;
          nbPages: number;
          query: string;
        }>({
          products: [],
          total: 0,
          page: 0,
          nbHits: 0,
          nbPages: 0,
          query: input.query,
        });
      }

      const firstResult = result.results[0];
      const hits = firstResult.hits || [];

      return new StepResponse<{
        products: AlgoliaSearchHit[];
        total: number;
        page: number;
        nbHits: number;
        nbPages: number;
        query: string;
      }>({
        products: hits,
        total: firstResult.nbHits || 0,
        page: firstResult.page || 0,
        nbHits: firstResult.nbHits || 0,
        nbPages: firstResult.nbPages || 0,
        query: input.query,
      });
    } catch {
      return new StepResponse<{
        products: AlgoliaSearchHit[];
        total: number;
        page: number;
        nbHits: number;
        nbPages: number;
        query: string;
      }>({
        products: [],
        total: 0,
        page: 0,
        nbHits: 0,
        nbPages: 0,
        query: input.query || '',
      });
    }
  },
);
