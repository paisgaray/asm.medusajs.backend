import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { createCartWorkflow } from '@medusajs/medusa/core-flows';
import { extractErrorMessage } from '../utils';

type CreateCartResult = {
  cartId: string;
};

export async function getOrCreateCart(
  req: MedusaRequest,
  res: MedusaResponse,
  cartId?: string,
  regionId?: string,
): Promise<CreateCartResult | null> {
  if (cartId) {
    return { cartId };
  }

  try {
    const { result: cartResult } = await createCartWorkflow(req.scope).run({
      input: {
        region_id: regionId,
      },
    });

    return { cartId: cartResult.id };
  } catch (error: unknown) {
    res.status(500).json({
      message: 'Failed to create cart',
      error: extractErrorMessage(error),
    });
    return null;
  }
}

