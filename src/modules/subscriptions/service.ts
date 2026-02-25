import { RemoteQueryFunction } from '@medusajs/framework/types';
import { MedusaService } from '@medusajs/framework/utils';

import { Subscription } from './models/subscription';

export default class SubscriptionModuleService extends MedusaService({
  Subscription,
}) {
  async getProductWithPrice(
    query: Omit<RemoteQueryFunction, symbol>,
    productId: string,
    variantId: string,
    currency: string,
  ) {
    // Fetch product and variant with prices
    const {
      data: [product],
    } = await query.graph({
      entity: 'product',
      filters: { id: productId },
      fields: ['id', 'title', 'variants.*', 'variants.prices.*'],
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const variant = product.variants?.find((v) => v.id === variantId);

    if (!variant) {
      throw new Error(`Variant ${variantId} not found for product ${productId}`);
    }

    // Get price for the variant in the specified currency
    let unitAmount = 0;
    if (variant.prices && variant.prices.length > 0) {
      const priceForCurrency = variant.prices.find((p) => p.currency_code === currency);
      if (priceForCurrency) {
        unitAmount = priceForCurrency.amount;
      }
    }

    if (unitAmount === 0) {
      throw new Error(`No price found for variant ${variant.id} in currency ${currency}`);
    }

    return {
      product_id: product.id,
      product_title: product.title,
      variant_id: variant.id,
      variant_title: variant.title || variant.sku || 'Default',
      unit_amount: unitAmount,
      currency,
    };
  }
}
