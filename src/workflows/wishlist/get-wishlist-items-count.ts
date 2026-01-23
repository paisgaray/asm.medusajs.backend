import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { countWishlistItemsStep } from './steps/count-wishlist-items-step';

type GetWishlistItemsCountWorkflowInput = {
  wishlist_id: string;
};

export const getWishlistItemsCountWorkflow = createWorkflow(
  'get-wishlist-items-count',
  (input: GetWishlistItemsCountWorkflowInput) => {
    const count = countWishlistItemsStep({ wishlist_id: input.wishlist_id });

    return new WorkflowResponse({ count });
  },
);
