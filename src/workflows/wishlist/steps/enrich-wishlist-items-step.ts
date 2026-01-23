import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

type WishlistItemRecord = {
  id: string;
  wishlist_id: string;
  product_id: string | null;
  product_variant_id: string | null;
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

type WishlistItemWithRelations = WishlistItemRecord & {
  variant?: ProductVariantEntry;
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
          } catch {}
        }

        return itemData;
      }),
    );

    return new StepResponse(itemsWithRelations);
  },
);
