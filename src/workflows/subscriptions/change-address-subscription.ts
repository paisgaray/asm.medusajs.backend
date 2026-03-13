import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { updateSubscriptionAddressStep } from './steps/update-subscription-address';
import { updateSubscriptionProgramationStep } from './steps/update-subscription-programation';

export type ChangeAddressSubscriptionWorkflowInput = {
  subscription_id: string;
  delivery_date: Date;
  period: 'morning' | 'afternoon' | 'evening';
  first_name: string;
  last_name: string;
  address_1: string;
  address_2: string;
  city: string;
  country_code: string;
  province: string;
  postal_code: string;
};

export const changeAddressSubscriptionWorkflow = createWorkflow(
  'change-address-subscription',
  (input: ChangeAddressSubscriptionWorkflowInput) => {
    updateSubscriptionProgramationStep({
      id: input.subscription_id,
      delivery_date: input.delivery_date,
      period: input.period,
    });

    updateSubscriptionAddressStep({
      id: input.subscription_id,
      first_name: input.first_name,
      last_name: input.last_name,
      address_1: input.address_1,
      address_2: input.address_2,
      city: input.city,
      country_code: input.country_code,
      province: input.province,
      postal_code: input.postal_code,
    });

    return new WorkflowResponse({
      subscription_id: input.subscription_id,
    });
  },
);
