import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { bulkAddWishlistItemsStep } from './steps/bulk-add-wishlist-items-step';
import { ensureWishlistStep } from './steps/ensure-wishlist-step';
import { formatBulkAddItemsResponseStep } from './steps/format-bulk-add-items-response-step';
import type { UpsertWishlistItemInput } from './steps/helpers/upsert-wishlist-item';

type WishlistItemInput = {
  product_id?: string;
  product_variant_id?: string;
  quantity?: number;
};

type AddItemToWishlistFlexibleInput = {
  wishlist_id?: string;
  customer_id?: string;
  name?: string;
  items?: WishlistItemInput[];
} & WishlistItemInput;

export const addItemToWishlistFlexibleWorkflow = createWorkflow(
  'add-item-to-wishlist-flexible',
  (input: AddItemToWishlistFlexibleInput) => {
    const wishlist = ensureWishlistStep({
      wishlist_id: input.wishlist_id,
      customer_id: input.customer_id,
      name: input.name,
    });

    const normalizedItems = transform({ input }, ({ input }) => {
      if (input.items && input.items.length > 0) {
        return input.items;
      }

      // Se não tem items array, verifica se tem item único
      const singleItem = {
        product_id: input.product_id,
        product_variant_id: input.product_variant_id,
        quantity: input.quantity,
      };

      // Verifica se tem product_variant_id
      if (!singleItem.product_variant_id) {
        return [];
      }

      return [singleItem];
    });

    const formattedItems = transform({ normalizedItems, wishlist }, ({ normalizedItems, wishlist }) =>
      normalizedItems.map<UpsertWishlistItemInput>((item) => ({
        wishlist_id: wishlist.id,
        product_id: item?.product_id,
        product_variant_id: item?.product_variant_id,
        quantity: item?.quantity,
      })),
    );

    const addedItemsResult = bulkAddWishlistItemsStep({
      wishlist_id: wishlist.id,
      items: formattedItems,
    });

    const formattedResponse = formatBulkAddItemsResponseStep({
      wishlist_id: wishlist.id,
      items: addedItemsResult.items,
    });

    return new WorkflowResponse(formattedResponse);
  },
);
