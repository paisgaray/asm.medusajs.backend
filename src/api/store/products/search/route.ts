import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { searchProductsWithPricingWorkflow } from '../../../../workflows/algolia/search-with-pricing';
import type { StoreProductSearchBody } from './validators';

export async function POST(req: MedusaRequest<StoreProductSearchBody>, res: MedusaResponse): Promise<void> {
  const { query, filters, page, limit, sortBy, sort_by, language, currency_code, region_id } = req.validatedBody;

  const { result } = await searchProductsWithPricingWorkflow(req.scope).run({
    input: {
      searchQuery: query || '',
      filters: filters || '',
      page: page ?? 0,
      limit: limit ?? 20,
      sortBy: sortBy || sort_by || undefined,
      language: language || 'es',
      currency_code,
      region_id,
    },
  });

  res.json(result);
}
