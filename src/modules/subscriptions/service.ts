import { RemoteQueryFunction } from '@medusajs/framework/types';
import { MedusaService } from '@medusajs/framework/utils';

import { Subscription } from './models/subscription';

export const SUBSCRIPTION_FIELDS = [
  'id',
  'status',
  'provider',
  'provider_subscription_id',
  'subscription_price',
  'currency',
  'frequency',
  'period',
  'current_period_start',
  'next_billing_date',
  'payment_last4',
  'payment_brand',
  'payment_exp_month',
  'payment_exp_year',
  'metadata',
  'created_at',
  'updated_at',
  'custom_bundles.*',
  'custom_bundles.items.*',
  'custom_items.*',
] as const;

export default class SubscriptionModuleService extends MedusaService({
  Subscription,
}) {
  /**
   * Resolve product data for all custom_items within subscriptions
   * (both bundle items and standalone items).
   * Cross-module link (custom_item → product) can't be traversed
   * in a single query.graph call, so we resolve it separately.
   */
  async enrichSubscriptionsWithProducts(
    query: Omit<RemoteQueryFunction, symbol>,
    subscriptions: Record<string, any>[],
  ) {
    const allItemIds = subscriptions.flatMap((sub) => {
      const bundleItemIds = (sub.custom_bundles || []).flatMap((b: any) => (b.items || []).map((i: any) => i.id));
      const standaloneItemIds = (sub.custom_items || []).map((i: any) => i.id);
      return [...bundleItemIds, ...standaloneItemIds];
    });
    const uniqueItemIds = [...new Set(allItemIds)];

    if (!uniqueItemIds.length) return;

    const { data: itemsWithProducts } = await query.graph({
      entity: 'custom_item',
      fields: ['id', 'product.*'],
      filters: { id: uniqueItemIds },
    });
    const productByItemId = Object.fromEntries(itemsWithProducts.map((i) => [i.id, i.product]));

    for (const sub of subscriptions) {
      for (const bundle of sub.custom_bundles || []) {
        for (const item of bundle.items || []) {
          item.product = productByItemId[item.id] ?? null;
        }
      }
      for (const item of sub.custom_items || []) {
        item.product = productByItemId[item.id] ?? null;
      }
    }
  }

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
