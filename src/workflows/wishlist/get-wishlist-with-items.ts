import { createWorkflow, parallelize, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { enrichWishlistItemsStep } from './steps/enrich-wishlist-items-step';
import {
  listWishlistItemsStep,
  type ListWishlistItemsStepInput,
  type WishlistItemListConfig,
} from './steps/list-wishlist-items-step';
import { retrieveWishlistStep, type RetrieveWishlistStepInput } from './steps/retrieve-wishlist-step';

type GetWishlistWithItemsWorkflowInput = {
  wishlist_id: string;
  retrieve_config?: RetrieveWishlistStepInput['config'];
  list_config?: WishlistItemListConfig;
  filterable_fields?: ListWishlistItemsStepInput['selector'];
};

export const getWishlistWithItemsWorkflow = createWorkflow(
  'get-wishlist-with-items',
  (input: GetWishlistWithItemsWorkflowInput) => {
    const [wishlist, itemsResult] = parallelize(
      retrieveWishlistStep({ wishlist_id: input.wishlist_id, config: input.retrieve_config }),
      listWishlistItemsStep({
        wishlist_id: input.wishlist_id,
        selector: input.filterable_fields,
        list_config: input.list_config,
      }),
    );
    const itemsWithRelations = enrichWishlistItemsStep({ items: itemsResult.items });

    return new WorkflowResponse({
      wishlist,
      items: itemsWithRelations,
    });
  },
);
