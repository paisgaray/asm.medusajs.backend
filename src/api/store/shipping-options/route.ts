import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

/**
 * Override default shipping options endpoint to support zipcode-based regions
 * without country_code validation
 *
 * This allows regions without countries (zipcode-based) to still show shipping options
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { cart_id } = req.query;

  if (!cart_id) {
    res.status(400).json({
      message: 'cart_id is required',
    });
    return;
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    // Get cart with its region
    const { data: carts } = await query.graph({
      entity: 'cart',
      fields: ['id', 'region_id', 'currency_code', 'shipping_address.*'],
      filters: { id: cart_id as string },
    });

    if (!carts.length) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }

    const cart = carts[0];

    logger.info(
      `Fetching shipping options for cart ${cart_id}: region=${cart.region_id}, currency=${cart.currency_code}`,
    );

    // Get all shipping options without geo zone filtering
    // This allows zipcode-based regions (without countries) to work
    const { data: shippingOptions } = await query.graph({
      entity: 'shipping_option',
      fields: [
        'id',
        'name',
        'price_type',
        'service_zone_id',
        'shipping_profile_id',
        'provider_id',
        'data',
        'metadata',
        'shipping_option_type_id',
        'service_zone.*',
        'service_zone.fulfillment_set.*',
      ],
      filters: {
        deleted_at: null,
      },
    });

    logger.info(`Found ${shippingOptions.length} total shipping options`);

    // Filter shipping options that have prices for the cart's currency/region
    const optionsWithPrices = [];

    for (const option of shippingOptions) {
      logger.info(`Checking shipping option: ${option.name} (${option.id})`);

      // Get price set for this shipping option
      const { data: priceSets } = await query.graph({
        entity: 'shipping_option_price_set',
        fields: ['price_set_id'],
        filters: { shipping_option_id: option.id },
      });

      logger.info(`  Found ${priceSets.length} price sets`);

      if (!priceSets.length) continue;

      const priceSetId = priceSets[0].price_set_id;

      // Check if there's a price for this cart's currency or region
      const { data: prices } = await query.graph({
        entity: 'price',
        fields: ['id', 'amount', 'currency_code', 'price_set_id'],
        filters: {
          price_set_id: priceSetId,
        },
      });

      logger.info(`  Found ${prices.length} prices for price set ${priceSetId}`);

      // Check if any price matches the cart's currency
      const matchingPrice = prices.find((p) => p.currency_code === cart.currency_code);

      logger.info(`  Matching price for ${cart.currency_code}: ${matchingPrice ? 'YES' : 'NO'}`);

      if (matchingPrice) {
        // Use the matching price directly
        // Region-specific pricing can be handled by having multiple prices with different rules
        optionsWithPrices.push({
          ...option,
          amount: matchingPrice.amount,
          price_type: option.price_type,
        });
      }
    }

    logger.info(
      `Found ${optionsWithPrices.length} shipping options for cart ${cart_id} (region: ${cart.region_id}, currency: ${cart.currency_code})`,
    );

    res.json({
      shipping_options: optionsWithPrices,
    });
  } catch (error) {
    logger.error('Error fetching shipping options:', error);
    res.status(500).json({
      message: 'Failed to fetch shipping options',
      error: error.message,
    });
  }
}
