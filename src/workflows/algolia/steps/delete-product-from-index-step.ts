import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { ALGOLIA_MODULE } from '../../../modules/algolia';
import AlgoliaModuleService from '../../../modules/algolia/service';

type DeleteProductFromIndexStepInput = {
  product_id: string;
  language?: string;
};

export const deleteProductFromIndexStep = createStep(
  'delete-product-from-index-step',
  async (input: DeleteProductFromIndexStepInput, { container }) => {
    const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);

    await algoliaService.deleteFromIndex([input.product_id], input.language);

    return new StepResponse({ deleted: true });
  },
);
