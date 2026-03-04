import { Modules } from '@medusajs/framework/utils';
import { createWorkflow, when, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { createRemoteLinkStep, removeRemoteLinkStep } from '@medusajs/medusa/core-flows';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import { createCustomBundleItemOverrideStep } from '../steps/create-custom-item-override';
import { createCustomBundleItemsStep } from '../steps/create-custom-items';
import { removeCustomBundleItemsStep } from '../steps/remove-custom-items';

export type UpdateCustomBundledItemWorkflowInput = {
  customBundle_id: string;
  applyToAllShipments: boolean;
  next_billing_date: Date;
  item: {
    bundleItemId: string;
    product_id: string;
  };
};

export const updateCustomBundledItemWorkflow = createWorkflow(
  'update-custom-bundle',
  ({ customBundle_id, applyToAllShipments, next_billing_date, item }: UpdateCustomBundledItemWorkflowInput) => {
    when({ applyToAllShipments }, ({ applyToAllShipments }) => !applyToAllShipments).then(() => {
      const customBundleItems = createCustomBundleItemOverrideStep({ customBundle_id, next_billing_date, item });

      createRemoteLinkStep([
        {
          [BUNDLED_PRODUCT_MODULE]: { custom_bundle_item_override_id: customBundleItems[0].id },
          [Modules.PRODUCT]: { product_id: item.product_id },
        },
      ]).config({ name: 'create-link-with-applyToNextShipments' });
    });

    when({ applyToAllShipments }, ({ applyToAllShipments }) => applyToAllShipments).then(() => {
      removeCustomBundleItemsStep({ bundleItemId: item.bundleItemId });
      removeRemoteLinkStep({ [BUNDLED_PRODUCT_MODULE]: { custom_bundle_item_id: item.bundleItemId } });

      const customBundleItems = createCustomBundleItemsStep({ customBundle_id, items: [item] });

      createRemoteLinkStep([
        {
          [BUNDLED_PRODUCT_MODULE]: { custom_bundle_item_id: customBundleItems[0].id },
          [Modules.PRODUCT]: { product_id: item.product_id },
        },
      ]).config({ name: 'create-link-without-applyToNextShipments' });
    });

    return new WorkflowResponse({});
  },
);
