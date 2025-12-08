import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { ALGOLIA_MODULE } from '../../../../modules/algolia';
import AlgoliaModuleService from '../../../../modules/algolia/service';
import { searchProductsWorkflow } from '../../../../workflows/algolia';
import type { StoreProductSearchBody } from './validators';

export async function POST(req: MedusaRequest<StoreProductSearchBody>, res: MedusaResponse): Promise<void> {
  const body = req.validatedBody as StoreProductSearchBody;
  const algoliaService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);

  if (body.language && !algoliaService.isLanguageSupported(body.language)) {
    res.status(400).json({
      message: `Language '${body.language}' is not supported. Supported languages: ${algoliaService.getSupportedLanguages().join(', ')}`,
    });
    return;
  }

  const validatedLanguage = algoliaService.validateLanguage(body.language);

  const input: {
    query: string;
    language?: string;
    filters?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  } = {
    query: body.query,
    language: validatedLanguage,
  };

  if (body.filters) {
    input.filters = body.filters;
  }
  if (body.page !== undefined) {
    input.page = body.page;
  }
  if (body.limit !== undefined) {
    input.limit = body.limit;
  }
  if (body.sortBy) {
    input.sortBy = body.sortBy;
  }

  const { result } = await searchProductsWorkflow(req.scope).run({
    input,
  });

  res.json(result || { products: [], total: 0, page: 0, nbHits: 0, nbPages: 0, query: body.query });
}
