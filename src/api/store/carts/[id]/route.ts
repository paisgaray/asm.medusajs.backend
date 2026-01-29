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
        'original_item_total',
        'original_item_subtotal',
        'original_item_tax_total',
        'shipping_total',
        'shipping_subtotal',
        'shipping_tax_total',
        'original_shipping_tax_total',
        'original_shipping_subtotal',
        'original_shipping_total',
        'credit_line_subtotal',
        'credit_line_tax_total',
        'credit_line_total',
        // relations
        'items.*',
        'items.variant.*',
        'items.product.*',
        'region.*',
        'shipping_methods.*',
        'shipping_address.*',
        'billing_address.*',
        'payment_collection.*',
        'payment_collection.payment_sessions.*',
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
