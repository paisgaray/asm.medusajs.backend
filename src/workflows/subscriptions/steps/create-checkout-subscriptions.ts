import { OrderDTO } from '@medusajs/framework/types';
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk';

import { SubscriptionProvider } from '../../../modules/subscriptions';
import { createSubscriptionWorkflow } from '../create-subscription';
import { SubscriptionItem } from './detect-subscription-items';

type CreateCheckoutSubscriptionsInput = {
  customer_id: string;
  subscription_items: SubscriptionItem[];
  order_id: string;
  order: OrderDTO;
  payment_provider_id: SubscriptionProvider;
  /** Pre-resolved Stripe customer ID from checkout payment session */
  payment_customer_id?: string;
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
    input: CreateCheckoutSubscriptionsInput,
    { container },
  ): Promise<StepResponse<CheckoutSubscriptionsOutput, CompensationData>> => {
    const logger = container.resolve('logger');

    if (!input.subscription_items.length) throw new Error('No subscription items found');

    logger.info(`Creating ${input.subscription_items.length} subscription(s) for order ${input.order_id}`);

    const subscriptions: unknown[] = [];
    const subscription_ids: string[] = [];

    for (const subscription_item of input.subscription_items) {
      // skip_first_charge: true because checkout already charged the customer for the first period.
      const { result } = await createSubscriptionWorkflow(container).run({
        input: {
          customer_id: input.customer_id,
          bundle_product_id: subscription_item.product_id,
          payment_provider_id: input.payment_provider_id,
          payment_customer_id: input.payment_customer_id,
          payment_method_id: input.payment_method_id,
          skip_first_charge: true,
          frequency: subscription_item.frequency,
          metadata: subscription_item.item.metadata,
          order: input.order,
        },
      });

      logger.info(`Created subscription ${result.subscription.id} for bundle ${subscription_item.product_id}`);

      subscriptions.push(result.subscription);
      subscription_ids.push(result.subscription.id);
    }

    return new StepResponse({ subscriptions, subscription_ids });
  },
);
