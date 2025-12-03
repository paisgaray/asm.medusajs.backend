import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { deleteProductFromIndexStep } from './steps/delete-product-from-index-step';

type DeleteProductFromIndexInput = {
  product_id: string;
};

export const deleteProductFromIndexWorkflow = createWorkflow(
  'delete-product-from-index',
  (input: DeleteProductFromIndexInput) => {
    const result = deleteProductFromIndexStep(input);
    return new WorkflowResponse({ deleted: result });
  },
);

