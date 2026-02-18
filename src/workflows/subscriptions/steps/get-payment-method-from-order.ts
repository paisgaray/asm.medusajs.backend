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

    logger.info(`Getting payment method from order ${order.id}`);

    // Get payment collection from order (already fetched with order)
    if (!order.payment_collections?.length) {
      throw new Error('No payment collections found for order');
    }

    const paymentCollection = order.payment_collections[0] as PaymentCollectionDTO & {
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
    let stripeCustomerId = sessionData.customer;

    logger.info(`Session data: ${JSON.stringify(sessionData)}`);

    // If not directly available, try to get from payment intent
    if ((!paymentMethodId || !stripeCustomerId) && sessionData.id) {
      const stripe = new Stripe(process.env.STRIPE_API_KEY!);

      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(sessionData.id);
        paymentMethodId = paymentMethodId || (paymentIntent.payment_method as string);
        stripeCustomerId = stripeCustomerId || (paymentIntent.customer as string);
        logger.info(
          `Retrieved from payment intent - payment_method: ${paymentMethodId}, customer: ${stripeCustomerId}`,
        );
      } catch (error) {
        logger.error('Failed to retrieve payment intent:', error);
      }
    }

    if (!paymentMethodId) {
      throw new Error('Could not extract payment method from order');
    }

    // Customer may be null if payment intent was created without a Stripe customer
    // The create-subscription workflow will handle customer creation in that case
    if (!stripeCustomerId) {
      logger.warn(
        `No Stripe customer found in payment data for order ${order.id} - will be created in subscription workflow`,
      );
    }

    logger.info(`Found payment method: ${paymentMethodId}, customer: ${stripeCustomerId || 'none - will create'}`);

    return new StepResponse({
      payment_method_id: paymentMethodId,
      stripe_customer_id: stripeCustomerId,
    });
  },
);
