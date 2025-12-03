import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { searchProductsWorkflow } from '../../../workflows/algolia';

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  try {
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
  } catch (error) {
    res.status(500).json({
      message: 'An error occurred while searching products',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
