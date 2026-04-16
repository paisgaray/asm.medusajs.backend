import { IPaymentModuleService } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SubscriptionProvider } from '../../../modules/subscriptions';
import { getProviderAdapter } from '../../../modules/subscriptions/adapters';
import { AccountHolderData } from './get-customer-account-holders-step';

export type PersistPaymentMethodStepInput = {
  account_holder: AccountHolderData;
  payment_method_id: string;
  payment_method_data?: Record<string, unknown>;
};

export const persistPaymentMethodStep = createStep(
  'persist-payment-method-step',
  async (input: PersistPaymentMethodStepInput, { container }) => {
    const adapter = getProviderAdapter(input.account_holder.provider_id as SubscriptionProvider);

    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const { data: accountHolders } = await query.graph(
      {
        entity: 'account_holder',
        fields: ['id', 'provider_id', 'data'],
        filters: { id: input.account_holder.id },
      },
      { throwIfKeyNotFound: false },
    );

    if (!accountHolders?.length) {
      throw new Error('Account holder not found');
    }

    const currentData = (accountHolders[0] as { data: Record<string, unknown> }).data ?? {};

    const updatedData = adapter.persistPaymentMethodLocally(
      currentData,
      input.payment_method_id,
      input.payment_method_data ?? {},
    );

    if (!updatedData) {
      return new StepResponse(undefined);
    }

    const paymentModuleService = container.resolve<IPaymentModuleService>(Modules.PAYMENT);

    await paymentModuleService.updateAccountHolder({
      id: input.account_holder.id,
      provider_id: input.account_holder.provider_id,
      context: {
        account_holder: {
          data: updatedData,
        },
      },
    });

    return new StepResponse(undefined);
  },
);
