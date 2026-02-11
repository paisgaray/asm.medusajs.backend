import { PaymentCollectionDTO, PaymentSessionDTO } from '@medusajs/framework/types';
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk';
import Stripe from 'stripe';

import { OrderWithItems } from './fetch-order-for-subscription';

export type PaymentMethodOutput = {
  payment_method_id: string;
  stripe_customer_id: string | undefined;
};

type PaymentSessionData = {
  id?: string;
  payment_method?: string;
  customer?: string;
};

/**
 * Extracts the Stripe payment method ID from the order's payment collection
 */
export const getPaymentMethodFromOrderStep = createStep(
  'get-payment-method-from-order',
  async ({ order }: { order: OrderWithItems }, { container }): Promise<StepResponse<PaymentMethodOutput>> => {
    const logger = container.resolve('logger');
    const query = container.resolve('query');

    logger.info(`Getting payment method from order ${order.id}`);

    // Get payment collection with sessions
    const { data: paymentCollections } = await query.graph({
      entity: 'payment_collection',
      fields: ['id', 'payment_sessions.*'],
      filters: { id: order.payment_collection_id },
    });

    const paymentCollection = paymentCollections[0] as PaymentCollectionDTO & {
      payment_sessions: PaymentSessionDTO[];
    };

    if (!paymentCollection?.payment_sessions?.length) {
      throw new Error('No payment sessions found for order');
    }

    // Find the Stripe payment session
    const stripeSession = paymentCollection.payment_sessions.find(
      (session) => session.provider_id === 'pp_stripe_stripe',
    );

    if (!stripeSession) {
      throw new Error('No Stripe payment session found');
    }

    // Extract payment method ID from session data
    const sessionData = (stripeSession.data || {}) as PaymentSessionData;
    let paymentMethodId = sessionData.payment_method;

    // If not directly available, try to get from payment intent
    if (!paymentMethodId && sessionData.id) {
      const stripe = new Stripe(process.env.STRIPE_API_KEY!);

      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(sessionData.id);
        paymentMethodId = paymentIntent.payment_method as string;
      } catch (error) {
        logger.error('Failed to retrieve payment intent:', error);
      }
    }

    if (!paymentMethodId) {
      throw new Error('Could not extract payment method from order');
    }

    logger.info(`Found payment method: ${paymentMethodId}`);

    return new StepResponse({
      payment_method_id: paymentMethodId,
      stripe_customer_id: sessionData.customer,
    });
  },
);
