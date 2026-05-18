import { createWorkflow, when, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { createWishlistStep } from './steps/create-wishlist-step';
import { listWishlistsStep } from './steps/list-wishlists-step';

type EnsureDefaultWishlistInput = {
  customer_id: string;
};

export const ensureDefaultWishlistWorkflow = createWorkflow(
  'ensure-default-wishlist',
  (input: EnsureDefaultWishlistInput) => {
    const listResult = listWishlistsStep({ customer_id: input.customer_id });

    when({ count: listResult.count }, ({ count }) => count === 0).then(() =>
      createWishlistStep({ customer_id: input.customer_id, name: 'mis-favoritos' }),
    );

    return new WorkflowResponse({});
  },
);
