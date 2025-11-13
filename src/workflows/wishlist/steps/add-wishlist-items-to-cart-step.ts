import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { addWishlistItemToCartWorkflow } from '../../wishlist/add-wishlist-item-to-cart';

type WishlistVariantItem = {
  id: string;
  wishlist_id: string;
  product_id: string;
  product_variant_id: string;
  quantity: number;
};

type AddedItem = {
  item_id: string;
  variant_id: string;
  quantity: number;
  original_variant_id?: string;
  fallback_used?: boolean;
};

type ItemError = {
  item_id: string;
  error: string;
};

type AddWishlistItemsToCartStepInput = {
  wishlist_id: string;
  cart_id: string;
  items: WishlistVariantItem[];
};

type AddWishlistItemsToCartStepOutput = {
  cart: unknown;
  added_items: AddedItem[];
  errors: ItemError[];
};

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.message === 'string') {
        return parsed.message;
      }
    } catch {
      // Ignore parsing errors and fallback to original message
    }
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    try {
      const serialized = JSON.stringify(error);
      return serialized;
    } catch {
      return String(error);
    }
  }

  return String(error);
}

export const addWishlistItemsToCartStep = createStep(
  'add-wishlist-items-to-cart-step',
  async (input: AddWishlistItemsToCartStepInput, { container }) => {
    const addedItems: AddedItem[] = [];
    const errors: ItemError[] = [];
    let finalCart: unknown;

    for (const item of input.items) {
      try {
        const workflow = addWishlistItemToCartWorkflow(container);
        const { result } = await workflow.run({
          input: {
            cart_id: input.cart_id,
            wishlist_id: input.wishlist_id,
            item_id: item.id,
            product_id: item.product_id,
            variant_id: item.product_variant_id,
            quantity: item.quantity,
          },
        });

        const validatedVariant = result.variant_validation;
        const finalVariantId = validatedVariant?.variant_id || item.product_variant_id;

        addedItems.push({
          item_id: item.id,
          variant_id: finalVariantId,
          quantity: item.quantity,
          original_variant_id: validatedVariant?.fallback ? item.product_variant_id : undefined,
          fallback_used: validatedVariant?.fallback || false,
        });

        finalCart = result.cart;
      } catch (error: unknown) {
        errors.push({
          item_id: item.id,
          error: extractErrorMessage(error),
        });
      }
    }

    const output: AddWishlistItemsToCartStepOutput = {
      cart: finalCart,
      added_items: addedItems,
      errors,
    };

    return new StepResponse(output);
  },
);
