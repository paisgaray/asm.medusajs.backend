import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { searchProductsWorkflow } from '../../../../workflows/algolia';
import type { StoreProductSearchBody } from './validators';

export async function POST(req: MedusaRequest<StoreProductSearchBody>, res: MedusaResponse): Promise<void> {
  const body = req.validatedBody as StoreProductSearchBody;

  const { result } = await searchProductsWorkflow(req.scope).run({
    input: {
      query: body.query,
    },
  });

  res.json({
    products: result?.products || [],
  });
}
