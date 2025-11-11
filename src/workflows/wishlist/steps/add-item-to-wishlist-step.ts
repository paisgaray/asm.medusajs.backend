import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type AddItemToWishlistStepInput = {
  wishlist_id: string;
  product_id?: string;
  product_variant_id?: string;
  bundle_id?: string;
  quantity?: number;
};

export const addItemToWishlistStep = createStep(
  'add-item-to-wishlist-step',
  async (input: AddItemToWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    const typeFilter = wishlistService.buildItemFilter({
      bundle_id: input.bundle_id,
      product_variant_id: input.product_variant_id,
    });

    const filters: {
      wishlist_id: string;
      product_id?: string;
      product_variant_id?: string;
      bundle_id?: string;
    } = {
      wishlist_id: input.wishlist_id,
      ...typeFilter,
    };

    if (typeFilter.product_variant_id && input.product_id) {
      filters.product_id = input.product_id;
    }

    const allItems = await wishlistService.listWishlistItems(filters);

    const existingItem = allItems.find((item) => {
      if (typeFilter.bundle_id) {
        return item.bundle_id === typeFilter.bundle_id;
      }
      if (typeFilter.product_variant_id) {
        const itemVariantId = item.product_variant_id || null;
        const searchVariantId = typeFilter.product_variant_id || null;
        return itemVariantId === searchVariantId;
      }
      return false;
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
            product_id: input.product_id || undefined,
            product_variant_id: typeFilter.product_variant_id || undefined,
            bundle_id: typeFilter.bundle_id || undefined,
            quantity: input.quantity || 1,
          });
        } else {
          throw error;
        }
      }
    } else {
      item = await wishlistService.createWishlistItems({
        wishlist_id: input.wishlist_id,
        product_id: input.product_id || undefined,
        product_variant_id: typeFilter.product_variant_id || undefined,
        bundle_id: typeFilter.bundle_id || undefined,
        quantity: input.quantity || 1,
      });
    }

    return new StepResponse(item);
  },
);
