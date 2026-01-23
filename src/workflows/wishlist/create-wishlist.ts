import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { createWishlistStep } from './steps/create-wishlist-step';

type CreateWishlistInput = {
  customer_id: string;
  name?: string;
};

export const createWishlistWorkflow = createWorkflow('create-wishlist', (input: CreateWishlistInput) => {
  const wishlist = createWishlistStep(input);
  return new WorkflowResponse({ wishlist });
});
