import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { enrichWishlistItemsStep } from './steps/enrich-wishlist-items-step';
import {
  listWishlistItemsStep,
  type ListWishlistItemsStepInput,
  type WishlistItemListConfig,
} from './steps/list-wishlist-items-step';

type ListWishlistItemsWorkflowInput = {
  wishlist_id: string;
  list_config?: WishlistItemListConfig;
  filterable_fields?: ListWishlistItemsStepInput['selector'];
};

export const listWishlistItemsWorkflow = createWorkflow(
  'list-wishlist-items',
  (input: ListWishlistItemsWorkflowInput) => {
    const itemsResult = listWishlistItemsStep({
      wishlist_id: input.wishlist_id,
      selector: input.filterable_fields,
      list_config: input.list_config,
    });
    const itemsWithRelations = enrichWishlistItemsStep({ items: itemsResult.items });

    return new WorkflowResponse({ items: itemsWithRelations, count: itemsResult.count });
  },
);
