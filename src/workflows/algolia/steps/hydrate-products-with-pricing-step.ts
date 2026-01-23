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

    // Extrair handles dos produtos do Algolia (usar handle em vez de ID pois o Algolia pode ter IDs de outro ambiente)
    const productHandles = hits.map((hit) => hit.handle).filter((handle): handle is string => Boolean(handle));

    if (productHandles.length === 0) {
      return new StepResponse({ products: [] });
    }

    // Fazer UMA query no Medusa para todos os produtos de uma vez usando HANDLES
    try {
      const { data: allProducts } = await query.graph(
        {
          entity: 'product',
          fields: ['id', 'title', 'handle', 'description', 'thumbnail', 'variants.*', 'variants.calculated_price.*'],
          filters: {
            handle: productHandles,
          },
          context: {
            variants: {
              calculated_price: QueryContext({
                currency_code: currency_code.toLowerCase(),
                region_id,
              }),
            },
          },
        },
        { throwIfKeyNotFound: false },
      );

      const products = allProducts || [];

      const productList = products;

      const productMapByHandle = new Map(productList.map((p) => [p.handle, p]));
      const productMapById = new Map(productList.map((p) => [p.id, p]));

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
    } catch (error) {
      console.error('Error hydrating products with pricing:', error);

      // Fallback: retornar produtos do Algolia sem pricing
      const fallbackProducts = hits.map(
        (hit: AlgoliaHit): Product => ({
          id: hit.objectID,
          title: hit.title,
          handle: hit.handle,
          description: hit.description,
          thumbnail: hit.thumbnail,
          variants: [],
        }),
      );

      return new StepResponse({ products: fallbackProducts });
    }
  },
);
