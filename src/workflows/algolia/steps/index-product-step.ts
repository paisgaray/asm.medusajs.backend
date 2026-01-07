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

type IndexProductStepInput = {
  product_id: string;
  region_id?: string;
  currency_code?: string;
  language?: string;
};

export const indexProductStep = createStep(
  'index-product-step',
  async (input: IndexProductStepInput, { container }) => {
    const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);
    const query = container.resolve('query');

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
          'variants.sales_count',
          'tags.*',
          'collection.*',
          'images.*',
          'sales_channels.*',
          'sales_channels.metadata.*',
          'created_at',
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
      let productsWithPrices = data as unknown as ProductInput[];

      if (allRegions.length > 0) {
        productsWithPrices = await enrichProductsWithRegionalPrices(productsWithPrices, allRegions, container);
      }

      try {
        await algoliaService.indexProducts(productsWithPrices, language);
      } catch (error) {
        const logger = container.resolve('logger');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to index product ${input.product_id} in language ${language}: ${errorMessage}`);
        throw error;
      }
    }

    return new StepResponse({ indexed: true, product_id: input.product_id });
  },
);
