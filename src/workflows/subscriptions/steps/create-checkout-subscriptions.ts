import { OrderDTO } from '@medusajs/framework/types';
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk';

import { createSubscriptionWorkflow } from '../create-subscription';
import { SubscriptionItem } from './detect-subscription-items';

type CreateCheckoutSubscriptionsInput = {
  customer_id: string;
  subscription_items: SubscriptionItem[];
  order_id: string;
  order: OrderDTO;
  /** Pre-resolved Stripe customer ID from checkout payment session */
  stripe_customer_id?: string;
  /** Payment method ID from checkout to attach to the customer */
  payment_method_id: string;
};

type CheckoutSubscriptionsOutput = {
  subscriptions: unknown[];
  subscription_ids: string[];
};

type CompensationData = {
  subscription_ids: string[];
};

/**
 * Creates one subscription per subscription item detected at checkout.
 * The Stripe customer is resolved once (first item) and reused for all subsequent items.
 */
export const createCheckoutSubscriptionsStep = createStep(
  'create-checkout-subscriptions',
  async (
    {
      customer_id,
      subscription_items,
      order_id,
      order,
      stripe_customer_id,
      payment_method_id,
    }: CreateCheckoutSubscriptionsInput,
    { container },
  ): Promise<StepResponse<CheckoutSubscriptionsOutput, CompensationData>> => {
    const logger = container.resolve('logger');

    if (!subscription_items.length) {
      throw new Error('No subscription items found');
    }

    logger.info(`Creating ${subscription_items.length} subscription(s) for order ${order_id}`);

    const subscriptions: unknown[] = [];
    const subscription_ids: string[] = [];

    // Resolve the Stripe customer once, then reuse it for every subsequent item
    // to avoid creating duplicate Stripe customers for the same checkout.
    let resolvedStripeCustomerId = stripe_customer_id;

    for (const subscription_item of subscription_items) {
      // skip_first_charge: true because checkout already charged the customer for the first period.
      // Only attach the payment method on the first call (subsequent ones reuse the already-resolved customer).
      const { result } = await createSubscriptionWorkflow(container).run({
        input: {
          customer_id,
          bundle_product_id: subscription_item.product_id,
          stripe_customer_id: resolvedStripeCustomerId,
          payment_method_id: resolvedStripeCustomerId ? undefined : payment_method_id,
          skip_first_charge: true,
          frequency: subscription_item.frequency,
          metadata: subscription_item.item.metadata,
          order,
        },
      });

      logger.info(`Created subscription ${result.subscription.id} for bundle ${subscription_item.product_id}`);

      subscriptions.push(result.subscription);
      subscription_ids.push(result.subscription.id);

      // After the first iteration the Stripe customer is guaranteed to exist;
      // use its ID directly for all remaining items.
      if (!resolvedStripeCustomerId) {
        resolvedStripeCustomerId = (result.subscription as any).provider_customer_id;
      }
    }

    return new StepResponse({ subscriptions, subscription_ids }, { subscription_ids });
  },
  async (compensationData: CompensationData | undefined, { container }) => {
    if (!compensationData?.subscription_ids?.length) return;

    const logger = container.resolve('logger');
    // Individual subscription rollback is handled inside createSubscriptionWorkflow.
    logger.info(
      `Checkout subscription step compensation for subscriptions: ${compensationData.subscription_ids.join(', ')}`,
    );
  },
);
