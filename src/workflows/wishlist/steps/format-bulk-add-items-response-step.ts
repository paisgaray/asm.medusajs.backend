import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

type WishlistItem = {
  id: string;
  product_id?: string | null;
  product_variant_id?: string | null;
  quantity?: number;
  [key: string]: unknown;
};

type FormatBulkAddItemsResponseStepInput = {
  wishlist_id: string;
  items: WishlistItem[];
};

type FormattedItem = {
  id: string;
  product_id: string | null;
  product_variant_id: string | null;
  quantity: number;
};

export const formatBulkAddItemsResponseStep = createStep(
  'format-bulk-add-items-response-step',
  async (input: FormatBulkAddItemsResponseStepInput) => {
    const formattedItems: FormattedItem[] = input.items
      .filter((item) => item && item.id)
      .map((item) => ({
        id: item.id,
        product_id: item.product_id || null,
        product_variant_id: item.product_variant_id || null,
        quantity: item.quantity || 1,
      }));

    return new StepResponse({
      wishlist_id: input.wishlist_id,
      items: formattedItems,
    });
  },
);
