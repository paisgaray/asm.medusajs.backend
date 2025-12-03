import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { searchProductsWorkflow } from '../../../../workflows/algolia';
import type { StoreProductSearchBody } from './validators';

export async function POST(
  req: MedusaRequest<StoreProductSearchBody>,
  res: MedusaResponse,
): Promise<void> {
  try {
    const body = req.validatedBody as StoreProductSearchBody;

    const { result } = await searchProductsWorkflow(req.scope).run({
      input: {
        query: body.query,
      },
    });

    res.json({
      products: result?.products || [],
    });
  } catch (error) {
    console.error('Error in search products route:', error);
    res.status(500).json({
      code: 'unknown_error',
      type: 'unknown_error',
      message: error instanceof Error ? error.message : 'An unknown error occurred.',
    });
  }
}

