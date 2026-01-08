import { DeleteEntityInput } from '@medusajs/framework/modules-sdk';
import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { deleteProductsWorkflow, removeRemoteLinkStep, useQueryGraphStep } from '@medusajs/medusa/core-flows';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import { removeBundleStep } from '../steps/remove-bundle';
import { removeBundleItemsStep } from '../steps/remove-bundle-items';

export type RemoveBundledProductWorkflowInput = {
  id: string;
};

export const removeBundledProductWorkflow = createWorkflow(
  'remove-bundled-product',
  ({ id }: RemoveBundledProductWorkflowInput) => {
    const { data } = useQueryGraphStep({
      entity: 'bundle',
      fields: ['*', 'product.*', 'items.*', 'items.product.*'],
      filters: { id },
      options: { throwIfKeyNotFound: true },
    });

    removeRemoteLinkStep([{ [BUNDLED_PRODUCT_MODULE]: { bundle_id: id } }]).config({
      name: 'delete-bundle-product-links',
    });

    removeBundleItemsStep({ id });

    const deleteInputs = transform({ bundles: data[0] }, (data): DeleteEntityInput[] => {
      return data.bundles.items.map((item) => ({ [BUNDLED_PRODUCT_MODULE]: { bundle_item_id: item.id } }));
    });

    removeRemoteLinkStep(deleteInputs).config({ name: 'delete-bundle-product-items-links' });

    deleteProductsWorkflow.runAsStep({ input: { ids: [data[0].product.id] } });

    const bundleDeleted = removeBundleStep({ id });

    return new WorkflowResponse(bundleDeleted);
  },
);
