import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import { addShippingMethodToCartWorkflow } from '../../../../../workflows/cart';

/**
 * Override add shipping method endpoint to support zipcode-based regions
 * without country_code validation
 *
 * This bypasses the geo zone validation that would normally fail for
 * regions without countries by directly manipulating the cart module
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { id: cartId } = req.params;
  const { option_id } = req.body as { option_id: string };

  if (!option_id) {
    res.status(400).json({ message: 'option_id is required' });
    return;
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    logger.info(`Adding shipping method ${option_id} to cart ${cartId} (bypassing geo zone validation)`);

    const { result } = await addShippingMethodToCartWorkflow(req.scope).run({
      input: {
        cart_id: cartId,
        option_id,
      },
    });

    logger.info(`Successfully added shipping method ${result.shipping_method.id} to cart ${cartId}`);

    res.json({ cart: result.cart });
  } catch (error) {
    logger.error('Error adding shipping method to cart:', error);

    if (error.message?.includes('not found')) {
      const notFoundEntity = error.message.includes('Cart') ? 'Cart' : 'Shipping option';
      res.status(404).json({ message: `${notFoundEntity} not found` });
      return;
    }

    res.status(500).json({
      message: 'Failed to add shipping method',
      error: error.message,
    });
  }
}
