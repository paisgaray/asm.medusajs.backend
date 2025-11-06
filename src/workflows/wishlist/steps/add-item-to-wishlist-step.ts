import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type AddItemToWishlistStepInput = {
  wishlist_id: string;
  product_id: string;
  product_variant_id?: string;
  quantity?: number;
};

export const addItemToWishlistStep = createStep(
  'add-item-to-wishlist-step',
  async (input: AddItemToWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const allItems = await wishlistService.listWishlistItems({
      wishlist_id: input.wishlist_id,
      product_id: input.product_id,
    });

    const existingItem = allItems.find((item) => {
      const itemVariantId = item.product_variant_id || null;
      const searchVariantId = input.product_variant_id || null;
      return itemVariantId === searchVariantId;
    });

    let item;
    if (existingItem && existingItem.id && existingItem.id.trim() !== '') {
      try {
        const updated = await wishlistService.updateWishlistItems(
          { id: existingItem.id },
          {
            quantity: existingItem.quantity + (input.quantity || 1),
          },
        );
        item = Array.isArray(updated) ? updated[0] : updated;
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('not found')) {
          item = await wishlistService.createWishlistItems({
            wishlist_id: input.wishlist_id,
            product_id: input.product_id,
            product_variant_id: input.product_variant_id || undefined,
            quantity: input.quantity || 1,
          });
        } else {
          throw error;
        }
      }
    } else {
      item = await wishlistService.createWishlistItems({
        wishlist_id: input.wishlist_id,
        product_id: input.product_id,
        product_variant_id: input.product_variant_id || undefined,
        quantity: input.quantity || 1,
      });
    }

    return new StepResponse(item);
  },
);

