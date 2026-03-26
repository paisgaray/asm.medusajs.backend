import { IPaymentModuleService } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { AccountHolderData } from './get-customer-account-holders-step';

export type SavePaymentMethodStepInput = {
  account_holder: AccountHolderData;
  payment_method_id: string;
  metadata?: Record<string, unknown>;
};

export const savePaymentMethodStep = createStep(
  'save-payment-method-step',
  async (input: SavePaymentMethodStepInput, { container }) => {
    const paymentModuleService = container.resolve<IPaymentModuleService>(Modules.PAYMENT);

    if (!input.account_holder.data?.id) {
      throw new Error('Account holder data is missing');
    }

    // createPaymentMethods routes to the provider's savePaymentMethod internally.
    // The `data` field is spread into Stripe's setupIntents.create, so
    // `payment_method` is the Stripe PM ID to attach to the customer.
    const savedMethod = await paymentModuleService.createPaymentMethods({
      provider_id: input.account_holder.provider_id,
      data: {
        payment_method: input.payment_method_id,
        confirm: true,
        usage: 'off_session',
      },
      context: {
        account_holder: {
          data: input.account_holder.data,
        },
      },
    });

    return new StepResponse(savedMethod);
  },
);
