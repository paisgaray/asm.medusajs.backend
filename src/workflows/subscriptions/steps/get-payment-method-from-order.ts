import { PaymentCollectionDTO, PaymentSessionDTO } from '@medusajs/framework/types';
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk';
import Stripe from 'stripe';

import { SubscriptionProvider } from '../../../modules/subscriptions';
import { OrderWithItems } from './fetch-order-for-subscription';

export type PaymentMethodOutput = {
  payment_provider_id: SubscriptionProvider;
  payment_method_id: string;
  payment_customer_id: string | undefined;
};

type PaymentSessionData = {
  id?: string;
  payment_method?: string;
  token?: string;
  customer?: string;
  context?: { cart: { customer_id: string } };
};

/**
 * Extracts the Stripe payment method ID from the order's payment collection
 */
export const getPaymentMethodFromOrderStep = createStep(
  'get-payment-method-from-order',
  async ({ order }: { order: OrderWithItems }, { container }): Promise<StepResponse<PaymentMethodOutput>> => {
    const logger = container.resolve('logger');

    if (!order.payment_collections?.length) throw new Error('No payment collections found for order');

    const paymentCollection = order.payment_collections[0] as PaymentCollectionDTO & {
      payment_sessions: PaymentSessionDTO[];
    };

    if (!paymentCollection?.payment_sessions?.length) throw new Error('No payment sessions found for order');

    // Find the Stripe payment session
    const paymentSession = paymentCollection.payment_sessions.find(
      (session) =>
        session.provider_id === SubscriptionProvider.STRIPE ||
        session.provider_id === SubscriptionProvider.GLOBAL_PAYMENTS,
    );

    if (!paymentSession) throw new Error('No payment session found');

    // Extract payment method ID from session data
    const sessionData = (paymentSession.data || {}) as PaymentSessionData;
    const paymentProviderId = paymentSession.provider_id as SubscriptionProvider;
    let paymentMethodId = sessionData?.payment_method || sessionData?.token;
    let paymentCustomerId = sessionData?.customer || sessionData?.context.cart.customer_id;

    // If not directly available, try to get from payment intent
    if (
      paymentSession.provider_id === SubscriptionProvider.STRIPE &&
      (!paymentMethodId || !paymentCustomerId) &&
      sessionData.id
    ) {
      const stripe = new Stripe(process.env.STRIPE_API_KEY!);

      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(sessionData.id);
        paymentMethodId = paymentMethodId || (paymentIntent.payment_method as string);
        paymentCustomerId = paymentCustomerId || (paymentIntent.customer as string);
      } catch (error) {
        logger.error('Failed to retrieve payment intent:', error);
      }
    }

    if (!paymentMethodId) throw new Error('Could not extract payment method from order');

    return new StepResponse({
      payment_provider_id: paymentProviderId,
      payment_method_id: paymentMethodId,
      payment_customer_id: paymentCustomerId,
    });
  },
);
