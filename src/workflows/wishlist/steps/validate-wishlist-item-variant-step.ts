import { MedusaError } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

type WishlistItemRecord = {
  id: string;
  wishlist_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  quantity: number;
  [key: string]: unknown;
};

type ValidatedWishlistVariantItem = WishlistItemRecord & {
  product_id: string;
  product_variant_id: string;
};

export const validateWishlistItemVariantStep = createStep(
  'validate-wishlist-item-variant-step',
  async (item: WishlistItemRecord) => {
    if (!item.product_id || !item.product_variant_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Item does not have a valid product/variant combination. Cannot add to cart.',
      );
    }

    const validatedItem: ValidatedWishlistVariantItem = {
      ...item,
      product_id: item.product_id,
      product_variant_id: item.product_variant_id,
    };

    return new StepResponse(validatedItem);
  },
);
