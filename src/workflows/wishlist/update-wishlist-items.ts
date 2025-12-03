import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { updateWishlistItemsStep } from './steps/update-wishlist-items-step';

type UpdateWishlistItemsWorkflowInput = {
  wishlist_id: string;
  items: {
    item_id: string;
    quantity: number;
  }[];
};

export const updateWishlistItemsWorkflow = createWorkflow(
  'update-wishlist-items',
  (input: UpdateWishlistItemsWorkflowInput) => {
    const result = updateWishlistItemsStep({
      wishlist_id: input.wishlist_id,
      items: input.items,
    });

    return new WorkflowResponse(result);
  },
);
