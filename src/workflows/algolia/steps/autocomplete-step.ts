import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { ALGOLIA_MODULE, type AlgoliaSearchHit } from '../../../modules/algolia';
import AlgoliaModuleService from '../../../modules/algolia/service';

type AutocompleteStepInput = {
  query: string;
  limit?: number;
  filters?: string;
};

export const autocompleteStep = createStep('autocomplete-step', async (input: AutocompleteStepInput, { container }) => {
  const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);

  const hitsPerPage = input.limit || 5;
  const filters = input.filters || '';
  const result = await algoliaService.autocomplete(input.query, hitsPerPage, filters);

  if (!result?.results?.[0]) {
    return new StepResponse<AlgoliaSearchHit[]>([]);
  }

  const hits = result.results[0].hits || [];

  return new StepResponse<AlgoliaSearchHit[]>(hits);
});
