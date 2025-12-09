import { createWorkflow, transform, when, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { addWishlistItemsToCartStep } from './steps/add-wishlist-items-to-cart-step';
import { ensureCartIdStep } from './steps/ensure-cart-id-step';
import { ensureVariantItemsStep } from './steps/ensure-variant-items-step';
import { filterWishlistVariantItemsStep } from './steps/filter-wishlist-variant-items-step';
import { listWishlistItemsStep } from './steps/list-wishlist-items-step';

type AddWishlistToCartWorkflowInput = {
  wishlist_id: string;
  cart_id?: string;
  region_id?: string;
};

export const addWishlistToCartWorkflow = createWorkflow(
  'add-wishlist-to-cart',
  (input: AddWishlistToCartWorkflowInput) => {
    const itemsResult = listWishlistItemsStep({ wishlist_id: input.wishlist_id });
    const variantItems = filterWishlistVariantItemsStep({ items: itemsResult.items });

    when({ variantItems }, ({ variantItems }) => !variantItems.length).then(() =>
      ensureVariantItemsStep({
        message: 'No items with variants found in wishlist. Cannot add to cart.',
      }),
    );

    const cart = ensureCartIdStep({ cart_id: input.cart_id, region_id: input.region_id });

    const processingResult = addWishlistItemsToCartStep({
      wishlist_id: input.wishlist_id,
      cart_id: cart.cart_id,
      items: variantItems,
    });

    const response = transform({ processingResult }, ({ processingResult }) => {
      const addedCount = processingResult.added_items.length;
      return {
        cart: processingResult.cart,
        added_items: processingResult.added_items,
        errors: processingResult.errors.length > 0 ? processingResult.errors : undefined,
        message: `Added ${addedCount} item(s) from wishlist to cart`,
      };
    });

    return new WorkflowResponse(response);
  },
);
