import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { searchProductsWorkflow } from '../../../../workflows/algolia';

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const query = (req.query.q as string) || '';
  const filters = (req.query.filters as string) || '';
  const page = req.query.page ? Number(req.query.page) : 0;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const sortBy = (req.query.sortBy as string) || undefined;

  const { result } = await searchProductsWorkflow(req.scope).run({
    input: {
      query,
      filters,
      page,
      limit,
      sortBy,
    },
  });

  res.json(result);
}
