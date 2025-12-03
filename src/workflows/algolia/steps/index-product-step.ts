import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { ALGOLIA_MODULE, type ProductInput } from '../../../modules/algolia';
import AlgoliaModuleService from '../../../modules/algolia/service';

type IndexProductStepInput = {
  product_id: string;
};

export const indexProductStep = createStep(
  'index-product-step',
  async (input: IndexProductStepInput, { container }) => {
    const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);
    const productModuleService = container.resolve('product');

    const product = await productModuleService.retrieveProduct(input.product_id, {
      relations: ['variants', 'tags', 'collection', 'images'],
    });

    await algoliaService.indexProducts([product as unknown as ProductInput]);

    return new StepResponse({ indexed: true, product_id: product.id });
  },
);
