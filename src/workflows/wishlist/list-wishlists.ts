import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { listWishlistsStep, type WishlistListConfig } from './steps/list-wishlists-step';

type ListWishlistsWorkflowInput = {
  customer_id: string;
  list_config?: WishlistListConfig;
};

export const listWishlistsWorkflow = createWorkflow('list-wishlists', (input: ListWishlistsWorkflowInput) => {
  const result = listWishlistsStep({
    customer_id: input.customer_id,
    list_config: input.list_config,
  });

  return new WorkflowResponse({
    wishlists: result.wishlists,
    count: result.count,
  });
});
