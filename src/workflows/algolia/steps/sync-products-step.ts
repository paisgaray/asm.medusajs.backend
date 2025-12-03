import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { ALGOLIA_MODULE, type ProductInput } from '../../../modules/algolia';
import AlgoliaModuleService from '../../../modules/algolia/service';

type SyncProductsStepInput = {
  limit?: number;
  offset?: number;
  filters?: {
    id?: string;
  };
};

export const syncProductsStep = createStep(
  'sync-products-step',
  async (input: SyncProductsStepInput, { container }) => {
    const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);
    const productModuleService = container.resolve('product');

    const limit = input.limit || 50;
    const offset = input.offset || 0;

    const selector: Record<string, string> = {};
    if (input.filters?.id) {
      selector.id = input.filters.id;
    }

    const [products, count] = await productModuleService.listAndCountProducts(selector, {
      skip: offset,
      take: limit,
      relations: ['variants', 'tags', 'collection', 'images'],
    });

    if (products?.length > 0) {
      await algoliaService.indexProducts(products as unknown as ProductInput[]);
    }

    return new StepResponse({
      products,
      metadata: { count, limit, offset },
    });
  },
);
