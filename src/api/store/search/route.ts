import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, QueryContext, Modules } from '@medusajs/framework/utils';

import { ALGOLIA_MODULE } from '../../../modules/algolia';
import AlgoliaModuleService from '../../../modules/algolia/service';

interface Region {
  id: string;
  currency_code: string;
}

interface CalculatedPrice {
  calculated_amount: number;
  original_amount: number;
  currency_code: string;
}

interface ProductVariant {
  id: string;
  title: string;
  calculated_price?: CalculatedPrice | null;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  thumbnail: string;
  variants: ProductVariant[];
}

interface AlgoliaHit {
  objectID: string;
  handle: string;
  title: string;
  description: string;
  thumbnail: string;
  [key: string]: unknown;
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  try {
    const algoliaModuleService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const searchQuery = (req.query.q as string) || '';
    const filters = (req.query.filters as string) || '';
    const pageParam = req.query.page !== undefined ? Number(req.query.page) : 0;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const sortBy = (req.query.sortBy as string) || undefined;
    const language = (req.query.language as string) || 'pt';
    const currency_code = (req.query.currency_code as string) || undefined;
    const region_id = (req.query.region_id as string) || undefined;

    const algoliaPage = Math.max(0, pageParam);
    const validatedLanguage = algoliaModuleService.validateLanguage(language);

    const results = await algoliaModuleService.searchProducts(
      searchQuery,
      filters,
      algoliaPage,
      limit,
      sortBy,
      validatedLanguage,
    );

    if (!results?.results?.[0]) {
      res.json({
        products: [],
        total: 0,
        page: algoliaPage,
        nbHits: 0,
        nbPages: 0,
        query: searchQuery,
      });
      return;
    }

    const firstResult = results.results[0];
    const hits = firstResult.hits || [];

    if (hits.length === 0) {
      res.json({
        products: [],
        total: firstResult.nbHits || 0,
        page: firstResult.page || 0,
        nbHits: firstResult.nbHits || 0,
        nbPages: firstResult.nbPages || 0,
        query: searchQuery,
      });
      return;
    }

    let finalRegionId = region_id;
    if (currency_code && !finalRegionId) {
      try {
        const regionModuleService = req.scope.resolve(Modules.REGION);
        const regions = (await regionModuleService.listRegions({})) as Region[];
        if (regions?.length > 0) {
          const matchingRegion = regions.find((r) => r.currency_code?.toLowerCase() === currency_code.toLowerCase());
          finalRegionId = matchingRegion?.id || regions[0].id;
        }
      } catch {
        finalRegionId = undefined;
      }
    }

    const context: Record<string, unknown> = {};
    if (currency_code || finalRegionId) {
      context.variants = {
        calculated_price: QueryContext({
          currency_code: currency_code?.toLowerCase(),
          region_id: finalRegionId,
        }),
      };
    }

    const queryOptions = {
      entity: 'product',
      fields: ['id', 'title', 'handle', 'description', 'thumbnail', 'variants.*', 'variants.calculated_price.*'],
      filters: {},
      ...(Object.keys(context).length > 0 ? { context } : {}),
    };

    let products: Product[] = [];
    try {
      const productPromises = hits.map(async (hit: AlgoliaHit) => {
        const handle = hit.handle;
        const algoliaId = hit.objectID;

        if (!handle && !algoliaId) {
          return null;
        }

        try {
          let product: Product | null = null;

          if (algoliaId) {
            const idQuery = {
              ...queryOptions,
              filters: { id: algoliaId },
            };
            const idResult = await query.graph(idQuery, {
              throwIfKeyNotFound: false,
            });
            product = (idResult?.data?.[0] as Product) || null;
          }

          if (!product && handle) {
            const handleQuery = {
              ...queryOptions,
              filters: { handle },
            };
            const handleResult = await query.graph(handleQuery, {
              throwIfKeyNotFound: false,
            });
            product = (handleResult?.data?.[0] as Product) || null;
          }

          return product;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(productPromises);
      products = results.filter((p): p is Product => p !== null);
    } catch {
      products = [];
    }

    const productMapByHandle = new Map<string, Product>(products.map((p) => [p.handle, p]));
    const productMapById = new Map<string, Product>(products.map((p) => [p.id, p]));

    const hydratedProducts = hits.map((hit: AlgoliaHit) => {
      let product = hit.objectID ? productMapById.get(hit.objectID) : undefined;
      if (!product && hit.handle) {
        product = productMapByHandle.get(hit.handle);
      }

      if (!product) {
        return hit;
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

    res.json({
      products: hydratedProducts,
      total: firstResult.nbHits || 0,
      page: firstResult.page || 0,
      nbHits: firstResult.nbHits || 0,
      nbPages: firstResult.nbPages || 0,
      query: searchQuery,
    });
  } catch (error) {
    let errorMessage = 'An error occurred while searching products';
    let errorCode = 'unknown_error';

    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
      if ('code' in error && typeof error.code === 'string') {
        errorCode = error.code;
      }
    }

    const statusCode = errorCode === 'ALGOLIA_UNREACHABLE' ? 503 : 500;

    res.status(statusCode).json({
      code: errorCode,
      type: errorCode,
      message: errorMessage,
      ...(error instanceof Error && 'details' in error && typeof error.details === 'string'
        ? { details: error.details }
        : {}),
    });
  }
}
