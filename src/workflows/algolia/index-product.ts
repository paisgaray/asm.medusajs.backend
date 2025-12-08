import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { indexProductStep } from './steps/index-product-step';

type IndexProductInput = {
  product_id: string;
  language?: string;
};

export const indexProductWorkflow = createWorkflow('index-product', (input: IndexProductInput) => {
  const productData = indexProductStep(input);
  return new WorkflowResponse({ product: productData });
});
