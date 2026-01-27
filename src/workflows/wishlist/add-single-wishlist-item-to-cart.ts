import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { addSingleWishlistItemToCartStep } from './steps/add-single-wishlist-item-to-cart-step';
import { ensureCartIdStep } from './steps/ensure-cart-id-step';
import { retrieveWishlistItemStep } from './steps/retrieve-wishlist-item-step';
import { validateWishlistItemVariantStep } from './steps/validate-wishlist-item-variant-step';

type AddSingleWishlistItemToCartWorkflowInput = {
  item_id: string;
  cart_id?: string;
  region_id?: string;
};

export const addSingleWishlistItemToCartWithCartWorkflow = createWorkflow(
  'add-single-wishlist-item-to-cart-with-cart',
  (input: AddSingleWishlistItemToCartWorkflowInput) => {
    const item = retrieveWishlistItemStep({ item_id: input.item_id });
    const validatedItem = validateWishlistItemVariantStep(item);
    const cart = ensureCartIdStep({ cart_id: input.cart_id, region_id: input.region_id });
    const stepInput = transform({ validatedItem, cart }, ({ validatedItem, cart }) => ({
      item: {
        id: validatedItem.id,
        wishlist_id: validatedItem.wishlist_id,
        product_id: validatedItem.product_id,
        product_variant_id: validatedItem.product_variant_id,
        quantity: validatedItem.quantity,
      },
      cart_id: cart.cart_id,
    }));
    const response = addSingleWishlistItemToCartStep(stepInput);

    return new WorkflowResponse(response);
  },
);
