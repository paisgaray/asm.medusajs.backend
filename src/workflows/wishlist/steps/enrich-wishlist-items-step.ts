import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

type WishlistItemRecord = {
  id: string;
  wishlist_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  bundle_id: string | null;
  quantity: number;
  [key: string]: unknown;
};

type ProductEntry = {
  id?: string;
  title?: string | null;
  handle?: string | null;
};

type ProductVariantEntry = {
  id: string;
  title?: string | null;
  sku?: string | null;
  product?: ProductEntry | null;
};

type BundleItemEntry = {
  id: string;
  product?: {
    id?: string;
    title?: string | null;
    variants?: ProductVariantEntry[];
  } | null;
};

type BundleEntry = {
  id: string;
  title?: string | null;
  items?: BundleItemEntry[];
};

type WishlistItemWithRelations = WishlistItemRecord & {
  variant?: ProductVariantEntry;
  bundle?: BundleEntry;
};

type EnrichWishlistItemsStepInput = {
  items: WishlistItemRecord[];
};

export const enrichWishlistItemsStep = createStep(
  'enrich-wishlist-items-step',
  async (input: EnrichWishlistItemsStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const itemsWithRelations = await Promise.all(
      input.items.map(async (item): Promise<WishlistItemWithRelations> => {
        const itemData: WishlistItemWithRelations = { ...item };

        if (item.product_variant_id) {
          try {
            const variantResult = (await query.graph({
              entity: 'product_variant',
              fields: ['id', 'title', 'sku', 'product.id', 'product.title', 'product.handle'],
              filters: {
                id: item.product_variant_id,
              },
            })) as { data?: ProductVariantEntry[] };

            if (variantResult.data && variantResult.data.length > 0) {
              itemData.variant = variantResult.data[0];
            }
          } catch {
            // Ignore errors when fetching variant
          }
        }

        if (item.bundle_id) {
          try {
            const bundleResult = (await query.graph({
              entity: 'bundle',
              fields: ['id', 'title', 'items.*', 'items.product.*', 'items.product.variants.*'],
              filters: {
                id: item.bundle_id,
              },
            })) as { data?: BundleEntry[] };

            if (bundleResult.data && bundleResult.data.length > 0) {
              itemData.bundle = bundleResult.data[0];
            }
          } catch {
            // Ignore errors when fetching bundle
          }
        }

        return itemData;
      }),
    );

    return new StepResponse(itemsWithRelations);
  },
);
