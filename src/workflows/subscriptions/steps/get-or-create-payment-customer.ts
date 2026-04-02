import { ICustomerModuleService } from '@medusajs/framework/types';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SubscriptionProvider } from '../../../modules/subscriptions';
import { getProviderAdapter } from '../../../modules/subscriptions/adapters';

type GetOrCreatePaymentCustomerStepInput = {
  payment_provider_id: SubscriptionProvider;
  customer_id: string;
};

export const getOrCreatePaymentCustomerStep = createStep(
  'get-or-create-payment-customer',
  async (input: GetOrCreatePaymentCustomerStepInput) => {
    const adapter = getProviderAdapter(input.payment_provider_id);

    const { paymentCustomerId, wasCreated, customer } = await adapter.getOrCreatePaymentCustomer(input.customer_id);

    return new StepResponse(
      { payment_customer_id: paymentCustomerId },
      {
        payment_customer_id: wasCreated ? paymentCustomerId : null,
        customer_id: input.customer_id,
        original_metadata: customer.metadata,
      },
    );
  },
  async (data, { container }) => {
    if (!data?.payment_customer_id) return;

    const customerService = container.resolve('customer') as ICustomerModuleService;

    try {
      await customerService.updateCustomers(data.customer_id, { metadata: data.original_metadata });
      container.resolve('logger').info(`Rolled back Stripe customer metadata for ${data.customer_id}`);
    } catch (error: any) {
      container.resolve('logger').error(`Failed to rollback customer metadata: ${error.message}`);
    }
  },
);
