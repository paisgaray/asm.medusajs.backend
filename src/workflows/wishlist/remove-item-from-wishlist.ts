import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { removeItemFromWishlistStep } from './steps/remove-item-from-wishlist-step';

type RemoveItemFromWishlistInput = {
  wishlist_id: string;
  item_id: string;
};

export const removeItemFromWishlistWorkflow = createWorkflow(
  'remove-item-from-wishlist',
  (input: RemoveItemFromWishlistInput) => {
    const result = removeItemFromWishlistStep(input);
    return new WorkflowResponse(result);
  },
);
