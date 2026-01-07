import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { ALGOLIA_MODULE } from '../../../../modules/algolia';
import AlgoliaModuleService from '../../../../modules/algolia/service';
import type { StoreProductSearchBody } from './validators';

export async function POST(req: MedusaRequest<StoreProductSearchBody>, res: MedusaResponse): Promise<void> {
  try {
    const algoliaModuleService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);
    const { query, filters, page, limit, sortBy, language } = req.validatedBody;

    const pageNum = page ?? 0;
    const limitNum = limit ?? 20;
    const validatedLanguage = algoliaModuleService.validateLanguage(language);

    const results = await algoliaModuleService.searchProducts(
      query || '',
      filters || '',
      pageNum,
      limitNum,
      sortBy,
      validatedLanguage,
    );

    if (!results?.results?.[0]) {
      res.json({
        products: [],
        total: 0,
        page: 0,
        nbHits: 0,
        nbPages: 0,
        query: query || '',
      });
      return;
    }

    const firstResult = results.results[0];
    res.json({
      products: firstResult.hits || [],
      total: firstResult.nbHits || 0,
      page: firstResult.page || 0,
      nbHits: firstResult.nbHits || 0,
      nbPages: firstResult.nbPages || 0,
      query: query || '',
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

    res.status(500).json({
      error: errorCode,
      message: errorMessage,
    });
  }
}
