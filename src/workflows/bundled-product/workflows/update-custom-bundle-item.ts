import { Modules } from '@medusajs/framework/utils';
import { createWorkflow, when, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { createRemoteLinkStep, removeRemoteLinkStep } from '@medusajs/medusa/core-flows';

import { BUNDLED_PRODUCT_MODULE } from '../../../modules/bundled-product';
import { createCustomBundleItemOverrideStep } from '../steps/create-custom-item-override';
import { createCustomBundleItemsStep } from '../steps/create-custom-items';
import { removeCustomBundleItemsStep } from '../steps/remove-custom-items';

export type UpdateCustomBundledItemWorkflowInput = {
  custom_bundle_id: string;
  custom_item_id: string;
  applyToAllShipments: boolean;
  expire_date: Date;
  product_id: string;
};

export const updateCustomBundledItemWorkflow = createWorkflow(
  'update-custom-bundle',
  ({
    custom_bundle_id,
    custom_item_id,
    product_id,
    applyToAllShipments,
    expire_date,
  }: UpdateCustomBundledItemWorkflowInput) => {
    when({ applyToAllShipments }, ({ applyToAllShipments }) => !applyToAllShipments).then(() => {
      const customBundleItems = createCustomBundleItemOverrideStep({
        custom_bundle_id,
        custom_item_id,
        expire_date,
      });

      createRemoteLinkStep([
        {
          [BUNDLED_PRODUCT_MODULE]: { custom_item_override_id: customBundleItems[0].id },
          [Modules.PRODUCT]: { product_id },
        },
      ]).config({ name: 'create-link-with-applyToNextShipments' });
    });

    when({ applyToAllShipments }, ({ applyToAllShipments }) => applyToAllShipments).then(() => {
      removeCustomBundleItemsStep({ custom_item_id });
      removeRemoteLinkStep({ [BUNDLED_PRODUCT_MODULE]: { custom_item_id } });

      const customBundleItems = createCustomBundleItemsStep({ custom_bundle_id, items: [{ product_id }] });

      createRemoteLinkStep([
        {
          [BUNDLED_PRODUCT_MODULE]: { custom_item_id: customBundleItems[0].id },
          [Modules.PRODUCT]: { product_id },
        },
      ]).config({ name: 'create-link-without-applyToNextShipments' });
    });

    return new WorkflowResponse({});
  },
);
