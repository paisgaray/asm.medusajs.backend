import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { updateWishlistStep } from './steps/update-wishlist-step';

type UpdateWishlistWorkflowInput = {
  wishlist_id: string;
  name?: string;
};

export const updateWishlistWorkflow = createWorkflow('update-wishlist', (input: UpdateWishlistWorkflowInput) => {
  const wishlist = updateWishlistStep({
    wishlist_id: input.wishlist_id,
    name: input.name,
  });

  return new WorkflowResponse({ wishlist });
});
