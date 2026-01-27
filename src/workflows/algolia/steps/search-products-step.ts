import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { ALGOLIA_MODULE } from '../../../modules/algolia';
import AlgoliaModuleService from '../../../modules/algolia/service';
import { AlgoliaHit } from '../types';

type SearchProductsStepInput = {
  searchQuery: string;
  filters?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  language?: string;
};

type SearchProductsStepOutput = {
  hits: AlgoliaHit[];
  total: number;
  page: number;
  nbHits: number;
  nbPages: number;
};

export const searchProductsStep = createStep(
  'search-products-step',
  async (input: SearchProductsStepInput, { container }): Promise<StepResponse<SearchProductsStepOutput>> => {
    const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);

    const page = input.page ?? 0;
    const limit = input.limit ?? 20;
    const validatedLanguage = algoliaService.validateLanguage(input.language);

    const result = await algoliaService.searchProducts(
      input.searchQuery,
      input.filters || '',
      page,
      limit,
      input.sortBy,
      validatedLanguage,
    );

    if (!result?.results?.[0]) {
      return new StepResponse({
        hits: [],
        total: 0,
        page,
        nbHits: 0,
        nbPages: 0,
      });
    }

    const firstResult = result.results[0];
    const hits = firstResult.hits || [];

    return new StepResponse({
      hits,
      total: firstResult.nbHits || 0,
      page: firstResult.page || 0,
      nbHits: firstResult.nbHits || 0,
      nbPages: firstResult.nbPages || 0,
    });
  },
);
