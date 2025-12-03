import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { ALGOLIA_MODULE, type AlgoliaSearchHit } from '../../../modules/algolia';
import AlgoliaModuleService from '../../../modules/algolia/service';

type SearchProductsStepInput = {
  query: string;
};

export const searchProductsStep = createStep(
  'search-products-step',
  async (input: SearchProductsStepInput, { container }) => {
    const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);

    const result = await algoliaService.search(input.query, 'product');

    if (!result?.results?.[0]) {
      return new StepResponse<AlgoliaSearchHit[]>([]);
    }

    const hits = result.results[0].hits || [];

    return new StepResponse<AlgoliaSearchHit[]>(hits);
  },
);
