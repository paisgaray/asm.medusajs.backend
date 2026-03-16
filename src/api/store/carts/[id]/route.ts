import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

type CartLineItem = {
  id: string;
  metadata?: Record<string, unknown> | null;
};

type CartGraphEntry = {
  id: string;
  items?: CartLineItem[];
  [key: string]: unknown;
};

type BundleGraphEntry = {
  id: string;
  title?: string | null;
  items?: unknown;
};

type BundleGroup = {
  bundle: BundleGraphEntry;
  items: CartLineItem[];
};

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const cartId = req.params.id as string;

  try {
    const cartResult = (await query.graph({
      entity: 'cart',
      fields: [
        'id',
        'currency_code',
        'email',
        'region_id',
        'created_at',
        'updated_at',
        'completed_at',
        'total',
        'subtotal',
        'tax_total',
        'discount_total',
        'discount_subtotal',
        'discount_tax_total',
        'original_total',
        'original_tax_total',
        'item_total',
        'item_subtotal',
        'item_tax_total',
        'item_discount_total',
        'original_item_total',
        'original_item_subtotal',
        'original_item_tax_total',
        'shipping_total',
        'shipping_subtotal',
        'shipping_tax_total',
        'shipping_discount_total',
        'original_shipping_tax_total',
        'original_shipping_subtotal',
        'original_shipping_total',
        'credit_line_subtotal',
        'credit_line_tax_total',
        'credit_line_total',
        'metadata',
        'sales_channel_id',
        'promotions.id',
        'promotions.code',
        'promotions.is_automatic',
        'promotions.is_tax_inclusive',
        'promotions.application_method.value',
        'promotions.application_method.type',
        'promotions.application_method.currency_code',
        'items.id',
        'items.thumbnail',
        'items.product',
        'items.product.id',
        'items.variant',
        'items.variant_id',
        'items.product_id',
        'items.product.categories.id',
        'items.product.tags.id',
        'items.product.tags.value',
        'items.product.collection_id',
        'items.product.type_id',
        'items.product_type_id',
        'items.product_title',
        'items.product_description',
        'items.product_subtitle',
        'items.product_type',
        'items.product_collection',
        'items.product_handle',
        'items.variant_sku',
        'items.variant_barcode',
        'items.variant_title',
        'items.requires_shipping',
        'items.metadata',
        'items.created_at',
        'items.updated_at',
        'items.title',
        'items.quantity',
        'items.unit_price',
        'items.compare_at_unit_price',
        'items.is_tax_inclusive',
        'items.tax_lines.id',
        'items.tax_lines.description',
        'items.tax_lines.code',
        'items.tax_lines.rate',
        'items.tax_lines.provider_id',
        'items.adjustments.id',
        'items.adjustments.code',
        'items.adjustments.promotion_id',
        'items.adjustments.amount',
        'items.adjustments.is_tax_inclusive',
        'customer.id',
        'customer.email',
        'customer.groups.id',
        'shipping_methods.tax_lines.id',
        'shipping_methods.tax_lines.description',
        'shipping_methods.tax_lines.code',
        'shipping_methods.tax_lines.rate',
        'shipping_methods.tax_lines.provider_id',
        'shipping_methods.amount',
        'shipping_methods.is_tax_inclusive',
        'shipping_methods.adjustments.id',
        'shipping_methods.adjustments.code',
        'shipping_methods.adjustments.amount',
        'shipping_methods.shipping_option_id',
        'shipping_address_id',
        'shipping_address.*',
        'billing_address_id',
        'billing_address.*',
        'region.id',
        'region.name',
        'region.currency_code',
        'region.automatic_taxes',
        'region.countries.*',
        'payment_collection.*',
        'payment_collection.payment_sessions.*',
        'credit_lines.*',
      ],
      filters: {
        id: cartId,
      },
    })) as { data?: CartGraphEntry[] };

    const cart = cartResult.data?.[0];

    if (!cart) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }

    const bundleGroups = new Map<string, BundleGroup>();
    const regularItems: CartLineItem[] = [];

    for (const item of cart.items || []) {
      const metadata = (item.metadata ?? {}) as Record<string, unknown>;
      const rawBundleId = metadata.bundle_id;
      const bundleId = typeof rawBundleId === 'string' && rawBundleId.length > 0 ? rawBundleId : null;

      if (bundleId) {
        if (!bundleGroups.has(bundleId)) {
          try {
            const bundleResult = (await query.graph({
              entity: 'bundle',
              fields: ['id', 'title', 'items.*', 'items.product.*', 'items.product.variants.*'],
              filters: {
                id: bundleId,
              },
            })) as { data?: BundleGraphEntry[] };

            const bundle = bundleResult.data?.[0];

            bundleGroups.set(bundleId, {
              bundle: bundle ?? { id: bundleId },
              items: [],
            });
          } catch {
            bundleGroups.set(bundleId, {
              bundle: { id: bundleId },
              items: [],
            });
          }
        }

        const bundleGroup = bundleGroups.get(bundleId);
        if (bundleGroup) {
          bundleGroup.items.push(item);
        }
      } else {
        regularItems.push(item);
      }
    }

    const bundles = Array.from(bundleGroups.values());

    const responseCart: CartGraphEntry & {
      bundles?: BundleGroup[];
      regular_items?: CartLineItem[];
    } = {
      ...cart,
    };

    if (bundles.length > 0 || regularItems.length > 0) {
      responseCart.bundles = bundles;
      responseCart.regular_items = regularItems;
    }

    res.json({
      cart: responseCart,
    });
  } catch (error: unknown) {
    res.status(500).json({
      message: 'Failed to retrieve cart',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
