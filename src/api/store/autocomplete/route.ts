import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { autocompleteWorkflow } from '../../../workflows/algolia';

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const query = (req.query.q as string) || '';
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const filters = (req.query.filters as string) || '';

  const { result } = await autocompleteWorkflow(req.scope).run({
    input: {
      query,
      limit,
      filters,
    },
  });

  res.json({
    suggestions: result?.suggestions || [],
  });
}
