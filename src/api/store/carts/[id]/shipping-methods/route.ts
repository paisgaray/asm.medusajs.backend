import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

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
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const cartModule = req.scope.resolve(Modules.CART);

  try {
    logger.info(`Adding shipping method ${option_id} to cart ${cartId} (bypassing geo zone validation)`);

    // Verify cart exists
    const { data: carts } = await query.graph({
      entity: 'cart',
      fields: ['id', 'region_id', 'currency_code'],
      filters: { id: cartId },
    });

    if (!carts.length) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }

    const cart = carts[0];

    // Get shipping option details including price
    const { data: shippingOptions } = await query.graph({
      entity: 'shipping_option',
      fields: ['id', 'name', 'price_type', 'provider_id', 'service_zone_id', 'shipping_profile_id'],
      filters: { id: option_id },
    });

    if (!shippingOptions.length) {
      res.status(404).json({ message: 'Shipping option not found' });
      return;
    }

    const shippingOption = shippingOptions[0];

    // Get price for this shipping option
    const { data: priceSets } = await query.graph({
      entity: 'shipping_option_price_set',
      fields: ['price_set_id'],
      filters: { shipping_option_id: option_id },
    });

    let amount = 0;
    if (priceSets.length > 0) {
      const { data: prices } = await query.graph({
        entity: 'price',
        fields: ['amount', 'currency_code'],
        filters: {
          price_set_id: priceSets[0].price_set_id,
          currency_code: cart.currency_code,
        },
      });

      if (prices.length > 0) {
        amount = prices[0].amount;
      }
    }

    // Remove existing shipping methods from cart
    const { data: existingMethods } = await query.graph({
      entity: 'shipping_method',
      fields: ['id'],
      filters: { cart_id: cartId },
    });

    if (existingMethods.length > 0) {
      await cartModule.softDeleteShippingMethods(existingMethods.map((m) => m.id));
    }

    // Add new shipping method directly using cart module
    const [shippingMethod] = await cartModule.addShippingMethods([
      {
        cart_id: cartId,
        name: shippingOption.name,
        shipping_option_id: option_id,
        amount: amount,
        data: {},
      },
    ]);

    logger.info(`Successfully added shipping method ${shippingMethod.id} to cart ${cartId}`);

    // Return updated cart
    const { data: updatedCarts } = await query.graph({
      entity: 'cart',
      fields: [
        'id',
        'region_id',
        'shipping_address.*',
        'billing_address.*',
        'items.*',
        'shipping_methods.*',
        'shipping_methods.shipping_option_id',
        'shipping_methods.amount',
      ],
      filters: { id: cartId },
    });

    res.json({ cart: updatedCarts[0] });
  } catch (error) {
    logger.error('Error adding shipping method to cart:', error);
    res.status(500).json({
      message: 'Failed to add shipping method',
      error: error.message,
      stack: error.stack,
    });
  }
}
