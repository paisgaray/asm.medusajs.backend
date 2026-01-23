import { createWorkflow, transform, when, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { ensureBundleItemStep } from './steps/ensure-bundle-item-step';
import { removeItemFromWishlistStep } from './steps/remove-item-from-wishlist-step';
import { retrieveWishlistItemStep } from './steps/retrieve-wishlist-item-step';

type RemoveWishlistBundleWorkflowInput = {
  wishlist_id: string;
  item_id: string;
};

export const removeWishlistBundleWorkflow = createWorkflow(
  'remove-wishlist-bundle',
  (input: RemoveWishlistBundleWorkflowInput) => {
    const item = retrieveWishlistItemStep({ item_id: input.item_id });

    when({ item }, ({ item }) => !item.bundle_id).then(() =>
      ensureBundleItemStep({
        message: 'Wishlist item is not a bundle and cannot be removed with this endpoint.',
      }),
    );

    const removalResult = removeItemFromWishlistStep({
      wishlist_id: input.wishlist_id,
      item_id: input.item_id,
    });

    const response = transform({ removalResult }, ({ removalResult }) => ({
      bundle_id: item.bundle_id,
      result: removalResult,
    }));

    return new WorkflowResponse(response);
  },
);
