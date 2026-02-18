import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk';

import { createSubscriptionWorkflow } from '../create-subscription';
import { SubscriptionItem } from './detect-subscription-items';

type CreateCheckoutSubscriptionsInput = {
  customer_id: string;
  subscription_items: SubscriptionItem[];
  order_id: string;
  /** Pre-resolved Stripe customer ID from checkout payment session */
  stripe_customer_id?: string;
  /** Payment method ID from checkout to attach to the customer */
  payment_method_id: string;
};

type CheckoutSubscriptionsOutput = {
  subscriptions: Record<string, unknown>[];
  subscription_ids: string[];
};

type CompensationData = {
  subscription_ids: string[];
};

/**
 * Creates subscriptions for each subscription item detected at checkout.
 * Calls the existing create-subscription workflow for each item.
 * One-time items are attached to the first subscription only.
 */
export const createCheckoutSubscriptionsStep = createStep(
  'create-checkout-subscriptions',
  async (
    {
      customer_id,
      subscription_items,
      order_id,
      stripe_customer_id,
      payment_method_id,
    }: CreateCheckoutSubscriptionsInput,
    { container },
  ): Promise<StepResponse<CheckoutSubscriptionsOutput, CompensationData>> => {
    const logger = container.resolve('logger');

    logger.info(`Creating ${subscription_items.length} subscription(s) for order ${order_id}`);

    const createdSubscriptions: Record<string, unknown>[] = [];

    for (const subItem of subscription_items) {
      // Call the existing create-subscription workflow
      // skip_first_charge: true because checkout already charged the customer for the first period
      const { result } = await createSubscriptionWorkflow(container).run({
        input: {
          customer_id,
          bundle_product_id: subItem.product_id,
          stripe_customer_id,
          payment_method_id,
          skip_first_charge: true,
        },
      });

      createdSubscriptions.push(result.subscription);

      logger.info(`Created subscription ${result.subscription.id} for product ${subItem.product_id}`);
    }

    const subscriptionIds = createdSubscriptions.map((s) => s.id as string);

    return new StepResponse(
      {
        subscriptions: createdSubscriptions,
        subscription_ids: subscriptionIds,
      },
      {
        subscription_ids: subscriptionIds,
      },
    );
  },
  async (compensationData: CompensationData | undefined, { container }) => {
    if (!compensationData?.subscription_ids?.length) return;

    const logger = container.resolve('logger');
    // Individual subscription rollback is handled by createSubscriptionWorkflow
    logger.info(
      `Checkout subscription step compensation for ${compensationData.subscription_ids.length} subscriptions`,
    );
  },
);
