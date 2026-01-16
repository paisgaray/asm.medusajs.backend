import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
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
    const pricingModule = container.resolve(Modules.PRICING);

    const queryOptions = {
      entity: 'product',
      fields: ['id', 'title', 'handle', 'description', 'thumbnail', 'variants.*'],
      filters: {},
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

    const variantIds: string[] = [];
    products.forEach((product) => {
      if (product.variants && Array.isArray(product.variants)) {
        // Correção 1: Tipagem específica para evitar 'any' desnecessário
        product.variants.forEach((variant: { id: string }) => {
          if (variant.id) {
            variantIds.push(variant.id);
          }
        });
      }
    });

    let calculatedPricesMap = new Map();
    if (variantIds.length > 0) {
      try {
        const pricesResult = await pricingModule.calculatePrices(
          { id: variantIds },
          {
            context: {
              currency_code: currency_code.toLowerCase(),
              region_id,
            },
          },
        );

        if (pricesResult instanceof Map) {
          calculatedPricesMap = pricesResult;
        } else if (typeof pricesResult === 'object' && pricesResult !== null) {
          calculatedPricesMap = new Map(Object.entries(pricesResult));
        }
      } catch (error) {
        console.error('Error calculating prices:', error);
      }
    }

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

      // Correção 2: Silenciando o linter apenas para esta linha, pois o spread ...variant requer flexibilidade
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enrichedVariants = product.variants?.map((variant: any) => {
        const calculatedPrice = calculatedPricesMap.get(variant.id);

        if (calculatedPrice) {
          return {
            ...variant,
            calculated_price: {
              id: calculatedPrice.id || null,
              is_calculated_price_price_list: calculatedPrice.is_calculated_price_price_list || false,
              is_calculated_price_tax_inclusive: calculatedPrice.is_calculated_price_tax_inclusive || false,
              calculated_amount: calculatedPrice.calculated_amount || 0,
              raw_calculated_amount: calculatedPrice.raw_calculated_amount || null,
              is_original_price_price_list: calculatedPrice.is_original_price_price_list || false,
              is_original_price_tax_inclusive: calculatedPrice.is_original_price_tax_inclusive || false,
              original_amount: calculatedPrice.original_amount || 0,
              raw_original_amount: calculatedPrice.raw_original_amount || null,
              currency_code: calculatedPrice.currency_code || currency_code.toLowerCase(),
              calculated_price: calculatedPrice.calculated_price || null,
              original_price: calculatedPrice.original_price || null,
            },
          };
        }

        return variant;
      });

      return {
        ...hit,
        id: product.id || hit.objectID,
        title: product.title || hit.title,
        handle: product.handle || hit.handle,
        description: product.description || hit.description,
        thumbnail: product.thumbnail || hit.thumbnail,
        variants: enrichedVariants || [],
      };
    });

    return new StepResponse({ products: hydratedProducts });
  },
);
