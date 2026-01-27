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

type WishlistVariantItem = WishlistItemRecord & {
  product_id: string;
  product_variant_id: string;
};

type FilterWishlistVariantItemsStepInput = {
  items: WishlistItemRecord[];
};

export const filterWishlistVariantItemsStep = createStep(
  'filter-wishlist-variant-items-step',
  async (input: FilterWishlistVariantItemsStepInput) => {
    const variantItems = input.items.filter(
      (item): item is WishlistVariantItem => Boolean(item.product_id) && Boolean(item.product_variant_id),
    );

    return new StepResponse(variantItems);
  },
);
