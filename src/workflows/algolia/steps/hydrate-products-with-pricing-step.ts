import { ContainerRegistrationKeys, QueryContext } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { AlgoliaHit, Product } from '../types';

interface HydrateProductsInput {
  hits: AlgoliaHit[];
  region_id: string;
  currency_code: string;
}

interface HydrateProductsOutput {
  products: Product[];
}

export const hydrateProductsWithPricingStep = createStep(
  'hydrate-products-with-pricing-step',
  async (input: HydrateProductsInput, { container }): Promise<StepResponse<HydrateProductsOutput>> => {
    const { hits, region_id, currency_code } = input;

    if (!hits || hits.length === 0) {
      return new StepResponse({ products: [] });
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const context = {
      variants: {
        calculated_price: QueryContext({
          currency_code: currency_code.toLowerCase(),
          region_id,
        }),
      },
    };

    const queryOptions = {
      entity: 'product',
      fields: [
        'id',
        'title',
        'handle',
        'description',
        'thumbnail',
        'variants.*',
        'variants.calculated_price.*',
        'variants.calculated_price.calculated_price.*',
        'variants.calculated_price.original_price.*',
      ],
      filters: {},
      context,
    };

    const productPromises = hits.map(async (hit: AlgoliaHit) => {
      const handle = hit.handle;
      const algoliaId = hit.objectID;

      if (!handle && !algoliaId) {
        return null;
      }

      try {
        let product = null;

        if (algoliaId) {
          const idQuery = { ...queryOptions, filters: { id: algoliaId } };
          const idResult = await query.graph(idQuery, { throwIfKeyNotFound: false });
          product = idResult?.data?.[0] || null;
        }

        if (!product && handle) {
          const handleQuery = { ...queryOptions, filters: { handle } };
          const handleResult = await query.graph(handleQuery, { throwIfKeyNotFound: false });
          product = handleResult?.data?.[0] || null;
        }

        return product;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(productPromises);
    const products = results.filter((p) => p !== null);

    const productMapByHandle = new Map(products.map((p) => [p.handle, p]));
    const productMapById = new Map(products.map((p) => [p.id, p]));

    const hydratedProducts = hits.map((hit: AlgoliaHit): Product => {
      let product = hit.objectID ? productMapById.get(hit.objectID) : undefined;
      if (!product && hit.handle) {
        product = productMapByHandle.get(hit.handle);
      }

      if (!product) {
        return {
          id: hit.objectID,
          title: hit.title,
          handle: hit.handle,
          description: hit.description,
          thumbnail: hit.thumbnail,
          variants: [],
        };
      }

      return {
        ...hit,
        id: product.id || hit.objectID,
        title: product.title || hit.title,
        handle: product.handle || hit.handle,
        description: product.description || hit.description,
        thumbnail: product.thumbnail || hit.thumbnail,
        variants: product.variants || [],
      };
    });

    return new StepResponse({ products: hydratedProducts });
  },
);
