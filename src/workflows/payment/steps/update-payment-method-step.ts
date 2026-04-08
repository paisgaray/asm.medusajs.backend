import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SubscriptionProvider } from '../../../modules/subscriptions';
import { getProviderAdapter } from '../../../modules/subscriptions/adapters';

export type UpdatePaymentMethodStepInput = {
  payment_method_id: string;
  account_holder_id: string;
  billing_details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export const updatePaymentMethodStep = createStep(
  'update-payment-method-step',
  async (input: UpdatePaymentMethodStepInput, { container }) => {
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
      data: { id?: string };
    };

    const adapter = getProviderAdapter(accountHolder.provider_id);
    await adapter.updatePaymentMethod(input.payment_method_id, {
      billing_details: input.billing_details,
      metadata: input.metadata,
    });

    return new StepResponse({ success: true });
  },
);
