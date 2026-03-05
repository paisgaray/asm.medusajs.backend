import { Modules } from '@medusajs/framework/utils';
import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { createRemoteLinkStep } from '@medusajs/medusa/core-flows';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import { createCustomBundleStep } from '../steps/create-custom-bundle';
import { createCustomBundleItemsStep } from '../steps/create-custom-items';

export type CreateCustomBundledProductWorkflowInput = {
  currency_code: string;
  bundle_id: string;
  items: {
    product_id: string;
  }[];
};

export const createCustomBundledProductWorkflow = createWorkflow(
  'create-custom-bundle',
  ({ currency_code, bundle_id, items }: CreateCustomBundledProductWorkflowInput) => {
    const customBundle = createCustomBundleStep({ currency_code, bundle_id });

    const customBundleItems = createCustomBundleItemsStep({ customBundle_id: customBundle.id, items });

    const bundleProductLinks = transform({ items, customBundleItems }, (data) => {
      return data.customBundleItems.map((item, index) => {
        return {
          [BUNDLED_PRODUCT_MODULE]: { custom_item_id: item.id },
          [Modules.PRODUCT]: { product_id: data.items[index].product_id },
        };
      });
    });

    createRemoteLinkStep(bundleProductLinks).config({
      name: 'create-bundle-product-items-links',
    });

    return new WorkflowResponse(customBundle);
  },
);
