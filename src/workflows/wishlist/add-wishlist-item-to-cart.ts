import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { addToCartWorkflow, useQueryGraphStep } from '@medusajs/medusa/core-flows';

type AddWishlistItemToCartInput = {
  cart_id: string;
  variant_id: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
};

export const addWishlistItemToCartWorkflow = createWorkflow(
  'add-wishlist-item-to-cart',
  (input: AddWishlistItemToCartInput) => {
    const itemData = transform(
      {
        variant_id: input.variant_id,
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

    return new WorkflowResponse({ cart: updatedCart[0] });
  },
);
