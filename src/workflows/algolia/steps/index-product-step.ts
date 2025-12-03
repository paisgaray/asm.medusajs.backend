import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { QueryContext, Modules } from '@medusajs/framework/utils';

import { ALGOLIA_MODULE, type ProductInput } from '../../../modules/algolia';
import AlgoliaModuleService from '../../../modules/algolia/service';

type IndexProductStepInput = {
  product_id: string;
  region_id?: string;
  currency_code?: string;
};

export const indexProductStep = createStep(
  'index-product-step',
  async (input: IndexProductStepInput, { container }) => {
    const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);
    const query = container.resolve('query');

    const currencyCode = input.currency_code || 'usd';

    let regionId = input.region_id;

    if (!regionId) {
      try {
        const regionModuleService = container.resolve(Modules.REGION);
        const regions = await regionModuleService.listRegions({});
        if (regions && regions.length > 0) {
          regionId = regions[0].id;
        }
      } catch {
        // Se não conseguir buscar região, continua sem region_id
      }
    }

    const context: Record<string, unknown> = {};
    if (regionId) {
      context.variants = {
        calculated_price: QueryContext({
          region_id: regionId,
          currency_code: currencyCode,
        }),
      };
    }

    const { data } = await query.graph(
      {
        entity: 'product',
        fields: [
          '*',
          'variants.*',
          'variants.calculated_price.*',
          'tags.*',
          'collection.*',
          'images.*',
        ],
        filters: {
          id: input.product_id,
        },
        context,
      },
      {
        throwIfKeyNotFound: false,
      },
    );

    if (data && data.length > 0) {
      await algoliaService.indexProducts(data as unknown as ProductInput[]);
    }

    return new StepResponse({ indexed: true, product_id: input.product_id });
  },
);
