import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { addItemToWishlistStep } from './steps/add-item-to-wishlist-step';

type AddItemToWishlistInput = {
  wishlist_id: string;
  product_id: string;
  product_variant_id?: string;
  quantity?: number;
};

export const addItemToWishlistWorkflow = createWorkflow(
  'add-item-to-wishlist',
  (input: AddItemToWishlistInput) => {
    const item = addItemToWishlistStep(input);
    return new WorkflowResponse({ item });
  },
);


