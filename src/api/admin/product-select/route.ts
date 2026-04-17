import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve('query');
  const { q, offset = '0', limit = '40' } = req.query as Record<string, string>;

  const { data: tags } = await query.graph({
    entity: 'product_tag',
    fields: ['id'],
    filters: { value: 'bundled' },
  });

  const bundledTagId = tags[0]?.id;

  const filters: Record<string, unknown> = {};

  if (q) {
    filters['title'] = { $ilike: `%${q}%` };
  }

  if (bundledTagId) {
    filters['tags'] = { id: { $nin: [bundledTagId] } };
  }

  const { data: products, metadata } = await query.graph({
    entity: 'product',
    fields: ['id', 'title', 'thumbnail'],
    filters,
    pagination: {
      take: parseInt(limit),
      skip: parseInt(offset),
    },
  });

  res.json({
    products,
    count: metadata?.count ?? 0,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
}
