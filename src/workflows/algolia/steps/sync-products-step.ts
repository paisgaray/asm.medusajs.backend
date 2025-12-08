import { QueryContext, Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { ALGOLIA_MODULE, type ProductInput } from '../../../modules/algolia';
import AlgoliaModuleService from '../../../modules/algolia/service';

async function enrichProductsWithRegionalPrices(
  products: ProductInput[],
  regions: Array<{ id: string; currency_code: string }>,
  container: { resolve: (name: string) => unknown },
): Promise<ProductInput[]> {
  if (!products || products.length === 0 || !regions || regions.length === 0) {
    return products;
  }

  try {
    const pricingModuleService = container.resolve('pricing') as {
      listPrices?: (filters: {
        variant_id: string[];
        region_id?: string;
      }) => Promise<Array<{ variant_id: string; amount: number }>>;
    };

    if (!pricingModuleService?.listPrices) {
      return products;
    }

    return Promise.all(
      products.map(async (product) => {
        if (!product.variants || product.variants.length === 0) {
          return product;
        }

        const pricesByRegion: Record<string, number> = {};
        const variantIds = product.variants.map((v) => v.id || '').filter(Boolean);

        if (variantIds.length === 0) {
          return product;
        }

        for (const region of regions) {
          try {
            const prices = await pricingModuleService.listPrices({
              variant_id: variantIds,
              region_id: region.id,
            });

            if (prices && Array.isArray(prices) && prices.length > 0) {
              const firstVariantPrice = prices.find((p) => variantIds.includes(p.variant_id));
              if (firstVariantPrice?.amount) {
                const regionKey = region.currency_code.toLowerCase();
                pricesByRegion[regionKey] = firstVariantPrice.amount;
              }
            }
          } catch {}
        }

        return {
          ...product,
          prices_by_region: Object.keys(pricesByRegion).length > 0 ? pricesByRegion : product.prices_by_region,
        };
      }),
    );
  } catch {
    return products;
  }
}

type SyncProductsStepInput = {
  limit?: number;
  offset?: number;
  filters?: {
    id?: string;
  };
  region_id?: string;
  currency_code?: string;
  language?: string;
};

export const syncProductsStep = createStep(
  'sync-products-step',
  async (input: SyncProductsStepInput, { container }) => {
    const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);
    const query = container.resolve('query');

    const limit = input.limit || 50;
    const offset = input.offset || 0;
    const currencyCode = input.currency_code || 'usd';
    const language = algoliaService.validateLanguage(input.language);

    let regionId = input.region_id;
    let allRegions: Array<{ id: string; currency_code: string }> = [];

    try {
      const regionModuleService = container.resolve(Modules.REGION);
      const regions = await regionModuleService.listRegions({});
      if (regions && regions.length > 0) {
        allRegions = regions.map((r: { id: string; currency_code: string }) => ({
          id: r.id,
          currency_code: r.currency_code || currencyCode,
        }));
        if (!regionId) {
          regionId = regions[0].id;
        }
      }
    } catch {}

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
          'variants.sales_count',
          'tags.*',
          'collection.*',
          'images.*',
          'created_at',
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
      let productsWithPrices = products as unknown as ProductInput[];

      if (allRegions.length > 0) {
        productsWithPrices = await enrichProductsWithRegionalPrices(productsWithPrices, allRegions, container);
      }

      await algoliaService.indexProducts(productsWithPrices, language);
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
