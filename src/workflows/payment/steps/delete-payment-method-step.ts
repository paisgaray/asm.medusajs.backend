import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

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
      provider_id: string;
      data: { id?: string };
    };

    const adapter = getProviderAdapter(accountHolder.provider_id);
    await adapter.detachPaymentMethod(input.payment_method_id);

    return new StepResponse({ success: true });
  },
);
