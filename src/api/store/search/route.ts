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
    let errorMessage = 'An error occurred while searching products';
    let errorCode = 'unknown_error';

    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
      if ('code' in error && typeof error.code === 'string') {
        errorCode = error.code;
      }
    }

    const statusCode = errorCode === 'ALGOLIA_UNREACHABLE' ? 503 : 500;

    res.status(statusCode).json({
      code: errorCode,
      type: errorCode,
      message: errorMessage,
      ...(error instanceof Error && 'details' in error && typeof error.details === 'string'
        ? { details: error.details }
        : {}),
    });
  }
}
