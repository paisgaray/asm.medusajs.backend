import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { deleteWishlistItemsStep } from './steps/delete-wishlist-items-step';
import { deleteWishlistStep } from './steps/delete-wishlist-step';

type DeleteWishlistWorkflowInput = {
  wishlist_id: string;
};

export const deleteWishlistWorkflow = createWorkflow('delete-wishlist', (input: DeleteWishlistWorkflowInput) => {
  deleteWishlistItemsStep({ wishlist_id: input.wishlist_id });
  const deletion = deleteWishlistStep({ wishlist_id: input.wishlist_id });

  return new WorkflowResponse(deletion);
});
