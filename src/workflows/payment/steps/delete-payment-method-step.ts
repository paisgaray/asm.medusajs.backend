import { IPaymentModuleService } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SubscriptionProvider } from '../../../modules/subscriptions';
import { getProviderAdapter } from '../../../modules/subscriptions/adapters';

export type DeletePaymentMethodStepInput = {
  payment_method_id: string;
  account_holder_id: string;
};

export const deletePaymentMethodStep = createStep(
  'delete-payment-method-step',
  async (input: DeletePaymentMethodStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const { data: accountHolders } = await query.graph({
      entity: 'account_holder',
      fields: ['id', 'provider_id', 'data'],
      filters: {
        id: input.account_holder_id,
      },
    });

    if (!accountHolders || accountHolders.length === 0) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Account holder not found');
    }

    const accountHolder = accountHolders[0] as {
      id: string;
      provider_id: SubscriptionProvider;
      data: Record<string, unknown>;
    };

    const adapter = getProviderAdapter(accountHolder.provider_id);

    // Detach from provider (Stripe: API call; GP: no-op — token revocation not required)
    await adapter.detachPaymentMethod(input.payment_method_id);

    // Remove from local storage if the provider uses it (GP stores cards in account_holder.data)
    const updatedData = adapter.removePaymentMethodLocally(accountHolder.data ?? {}, input.payment_method_id);

    if (updatedData) {
      const paymentModuleService = container.resolve<IPaymentModuleService>(Modules.PAYMENT);
      await paymentModuleService.updateAccountHolder({
        id: accountHolder.id,
        provider_id: accountHolder.provider_id,
        context: { account_holder: { data: updatedData } },
      });
    }

    return new StepResponse({ success: true });
  },
);
