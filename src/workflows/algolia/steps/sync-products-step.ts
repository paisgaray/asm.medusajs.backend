import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { QueryContext, Modules } from '@medusajs/framework/utils';

import { ALGOLIA_MODULE, type ProductInput } from '../../../modules/algolia';
import AlgoliaModuleService from '../../../modules/algolia/service';

type SyncProductsStepInput = {
  limit?: number;
  offset?: number;
  filters?: {
    id?: string;
  };
  region_id?: string;
  currency_code?: string;
};

export const syncProductsStep = createStep(
  'sync-products-step',
  async (input: SyncProductsStepInput, { container }) => {
    const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);
    const query = container.resolve('query');

    const limit = input.limit || 50;
    const offset = input.offset || 0;
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

    const filters: Record<string, unknown> = {};
    if (input.filters?.id) {
      filters.id = input.filters.id;
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

    const { data: products, metadata } = await query.graph(
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
        filters,
        pagination: {
          take: limit,
          skip: offset,
        },
        context,
      },
      {
        throwIfKeyNotFound: false,
      },
    );

    if (products && products.length > 0) {
      await algoliaService.indexProducts(products as unknown as ProductInput[]);
    }

    const count = metadata?.count || products?.length || 0;

    return new StepResponse({
      products: products || [],
      metadata: {
        count,
        limit,
        offset,
      },
    });
  },
);
