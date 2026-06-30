import { RemoteQueryFunction } from '@medusajs/framework/types';
import { MedusaService } from '@medusajs/framework/utils';

import { formatPrice } from '../../utils/resolve-subscription-price';
import { Subscription } from './models/subscription';
import { SubscriptionAddress } from './models/subscriptionAddress';
import { SubscriptionInvoice } from './models/subscriptionInvoice';

export const SUBSCRIPTION_FIELDS = [
  'id',
  'status',
  'provider_id',
  'provider_subscription_id',
  'subscription_price',
  'currency',
  'frequency',
  'delivery_date',
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
  'custom_bundles.product.*',
  'custom_bundles.product.variants.*',
  'custom_bundles.product.variants.options.*',
  'custom_bundles.items.product.*',
  'custom_bundles.items.*',
  'custom_items.*',
  'custom_items.product.*',
  'address.*',
] as const;

export const SUBSCRIPTION_ADMIN_LIST_FIELDS = [
  'id',
  'status',
  'provider_id',
  'provider_subscription_id',
  'subscription_price',
  'currency',
  'frequency',
  'next_billing_date',
  'created_at',
] as const;

export default class SubscriptionModuleService extends MedusaService({
  Subscription,
  SubscriptionAddress,
  SubscriptionInvoice,
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
      const bundleItemIds = (sub?.custom_bundles || []).flatMap((b: any) =>
        (b?.custom_items || []).map((i: any) => i.id),
      );
      const standaloneItemIds = (sub?.custom_items || []).map((i: any) => i.id);
      return [...bundleItemIds, ...standaloneItemIds];
    });
    const uniqueItemIds = [...new Set(allItemIds)];

    if (!uniqueItemIds.length) {
      for (const sub of subscriptions) {
        sub.calculated_price = formatPrice(sub.subscription_price ?? 0);
        for (const bundle of sub?.custom_bundles || []) {
          bundle.calculated_price = formatPrice(bundle.item_price ?? 0);
        }
      }
      return;
    }

    const { data: itemsWithProducts } = await query.graph({
      entity: 'custom_item',
      fields: ['id', 'product.*'],
      filters: { id: uniqueItemIds },
    });
    const productByItemId = Object.fromEntries(itemsWithProducts.map((i) => [i.id, i.product]));

    for (const sub of subscriptions) {
      sub.calculated_price = formatPrice(sub.subscription_price ?? 0);

      for (const bundle of sub?.custom_bundles || []) {
        bundle.calculated_price = formatPrice(bundle.item_price ?? 0);

        for (const item of bundle?.custom_items || []) {
          item.product = productByItemId[item.id] ?? null;
          item.calculated_price = formatPrice(item.item_price ?? 0);
        }
      }
      for (const item of sub?.custom_items || []) {
        item.product = productByItemId[item.id] ?? null;
        item.calculated_price = formatPrice(item.item_price ?? 0);
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
