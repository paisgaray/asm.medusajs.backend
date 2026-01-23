import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { enrichWishlistItemsStep } from './steps/enrich-wishlist-items-step';
import { findSharedWishlistStep } from './steps/find-shared-wishlist-step';
import {
  listWishlistItemsStep,
  type ListWishlistItemsStepInput,
  type WishlistItemListConfig,
} from './steps/list-wishlist-items-step';

type GetSharedWishlistWorkflowInput = {
  share_token: string;
  list_config?: WishlistItemListConfig;
  filterable_fields?: ListWishlistItemsStepInput['selector'];
};

export const getSharedWishlistWorkflow = createWorkflow(
  'get-shared-wishlist',
  (input: GetSharedWishlistWorkflowInput) => {
    const wishlist = findSharedWishlistStep({ share_token: input.share_token });
    const wishlistId = transform({ wishlist }, ({ wishlist }) => wishlist.id);
    const itemsResult = listWishlistItemsStep({
      wishlist_id: wishlistId,
      selector: input.filterable_fields,
      list_config: input.list_config,
    });
    const itemsWithRelations = enrichWishlistItemsStep({ items: itemsResult.items });

    return new WorkflowResponse({
      wishlist,
      items: itemsWithRelations,
    });
  },
);
