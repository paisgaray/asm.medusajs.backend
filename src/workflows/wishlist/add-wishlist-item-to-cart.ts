import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { addToCartWorkflow, useQueryGraphStep } from '@medusajs/medusa/core-flows';

import { removeItemFromWishlistStep } from './steps/remove-item-from-wishlist-step';
import { validateVariantStep } from './steps/validate-variant-step';

type AddWishlistItemToCartInput = {
  cart_id: string;
  wishlist_id?: string;
  item_id?: string;
  product_id: string;
  variant_id: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
};

export const addWishlistItemToCartWorkflow = createWorkflow(
  'add-wishlist-item-to-cart',
  (input: AddWishlistItemToCartInput) => {
    const validatedVariant = validateVariantStep({
      product_id: input.product_id,
      variant_id: input.variant_id,
    });

    const itemData = transform(
      {
        variant_id: validatedVariant.variant_id,
        quantity: input.quantity || 1,
        metadata: input.metadata,
      },
      (data) => ({
        variant_id: data.variant_id,
        quantity: data.quantity,
        metadata: data.metadata,
      }),
    );

    addToCartWorkflow.runAsStep({
      input: {
        cart_id: input.cart_id,
        items: [itemData],
      },
    });

    const { data: updatedCart } = useQueryGraphStep({
      entity: 'cart',
      fields: ['*', 'items.*'],
      filters: { id: input.cart_id },
    }).config({ name: 'refetch-cart' });

    if (input.wishlist_id && input.item_id) {
      removeItemFromWishlistStep({
        wishlist_id: input.wishlist_id,
        item_id: input.item_id,
      });
    }

    return new WorkflowResponse({
      cart: updatedCart[0],
      variant_validation: validatedVariant,
    });
  },
);
