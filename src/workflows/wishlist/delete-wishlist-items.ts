import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { deleteWishlistItemsStep } from './steps/delete-wishlist-items-step';

type DeleteWishlistItemsWorkflowInput = {
  wishlist_id: string;
};

export const deleteWishlistItemsWorkflow = createWorkflow(
  'delete-wishlist-items',
  (input: DeleteWishlistItemsWorkflowInput) => {
    const deletionResult = deleteWishlistItemsStep({ wishlist_id: input.wishlist_id });

    const summary = transform({ deletionResult }, ({ deletionResult }) => deletionResult);

    return new WorkflowResponse(summary);
  },
);
