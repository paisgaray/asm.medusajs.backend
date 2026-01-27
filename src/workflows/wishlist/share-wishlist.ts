import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { shareWishlistStep } from './steps/share-wishlist-step';

type ShareWishlistInput = {
  wishlist_id: string;
};

export const shareWishlistWorkflow = createWorkflow('share-wishlist', (input: ShareWishlistInput) => {
  const result = shareWishlistStep(input);
  return new WorkflowResponse(result);
});
