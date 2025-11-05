import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { addItemToWishlistStep } from './steps/add-item-to-wishlist-step';
import { validateVariantForWishlistStep } from './steps/validate-variant-for-wishlist-step';

type AddItemToWishlistInput = {
  wishlist_id: string;
  product_id: string;
  product_variant_id?: string;
  quantity?: number;
};

export const addItemToWishlistWorkflow = createWorkflow('add-item-to-wishlist', (input: AddItemToWishlistInput) => {
  if (input.product_variant_id) {
    validateVariantForWishlistStep({
      product_id: input.product_id,
      product_variant_id: input.product_variant_id,
    });
  }

  const item = addItemToWishlistStep(input);
  return new WorkflowResponse({ item });
});
