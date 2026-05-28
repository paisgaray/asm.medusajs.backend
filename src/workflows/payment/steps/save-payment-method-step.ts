import { IPaymentModuleService } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SubscriptionProvider } from '../../../modules/subscriptions';
import { getProviderAdapter } from '../../../modules/subscriptions/adapters';
import { AccountHolderData } from './get-customer-account-holders-step';

export type SavePaymentMethodStepInput = {
  account_holder: AccountHolderData;
  payment_method_id: string;
  metadata?: Record<string, unknown>;
};

export type SavePaymentMethodStepOutput = {
  savedMethod: ReturnType<IPaymentModuleService['createPaymentMethods']> extends Promise<infer T> ? T : never;
  providerData: Record<string, unknown>;
};

export const savePaymentMethodStep = createStep(
  'save-payment-method-step',
  async (input: SavePaymentMethodStepInput, { container }) => {
    const paymentModuleService = container.resolve<IPaymentModuleService>(Modules.PAYMENT);

    if (!input.account_holder.data?.id) {
      throw new Error('Account holder data is missing');
    }

    const adapter = getProviderAdapter(input.account_holder.provider_id as SubscriptionProvider);
    const providerData = await adapter.preparePaymentMethodData(input.payment_method_id, {
      customer_id: input.account_holder.data.id,
      metadata: input.metadata,
    });

    const savedMethod = await paymentModuleService.createPaymentMethods({
      provider_id: input.account_holder.provider_id,
      data: providerData,
      context: {
        account_holder: {
          data: input.account_holder.data,
        },
      },
    });

    return new StepResponse({ savedMethod, providerData });
  },
);
