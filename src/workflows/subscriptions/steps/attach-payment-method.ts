import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk';

import { SubscriptionProvider } from '../../../modules/subscriptions';
import { getProviderAdapter } from '../../../modules/subscriptions/adapters';

type AttachPaymentMethodInput = {
  payment_provider_id: SubscriptionProvider;
  payment_method_id: string;
  payment_customer_id: string;
};

/**
 * Attaches a payment method to a Stripe customer and sets it as default
 */
export const attachPaymentMethodStep = createStep('attach-payment-method', async (input: AttachPaymentMethodInput) => {
  const adapter = getProviderAdapter(input.payment_provider_id);

  const { payment_method_id, paymentMethod } = await adapter.attachPaymentMethod(
    input.payment_method_id,
    input.payment_customer_id,
  );

  return new StepResponse({
    payment_method_id,
    brand: paymentMethod.brand,
    last4: paymentMethod.last4,
    exp_month: paymentMethod.exp_month,
    exp_year: paymentMethod.exp_year,
  });
});
