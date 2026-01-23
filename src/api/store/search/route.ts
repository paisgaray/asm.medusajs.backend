import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { searchProductsWithPricingWorkflow } from '../../../workflows/algolia/search-with-pricing';

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { result } = await searchProductsWithPricingWorkflow(req.scope).run({
    input: {
      searchQuery: (req.query.q as string) || '',
      filters: (req.query.filters as string) || '',
      page: req.query.page !== undefined ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      sortBy: (req.query.sortBy as string) || (req.query.sort_by as string) || undefined,
      language: (req.query.language as string) || 'es',
      currency_code: (req.query.currency_code as string) || undefined,
      region_id: (req.query.region_id as string) || undefined,
    },
  });

  res.json(result);
}
