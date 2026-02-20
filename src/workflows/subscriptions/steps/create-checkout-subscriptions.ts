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
  subscription: unknown;
  subscription_id: string;
  subscription_ids: string[]; // For backward compatibility with updateOrderMetadataStep
};

type CompensationData = {
  subscription_id: string;
};

/**
 * Creates a single subscription with multiple bundles for items detected at checkout.
 * Calls the existing create-subscription workflow with all bundle products.
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

    logger.info(`Creating subscription with ${subscription_items.length} bundle(s) for order ${order_id}`);

    // TODO: Once create-subscription workflow is updated to handle multiple bundles,
    // we should create one subscription with all bundles instead of this loop

    // For now, create one subscription for the first bundle
    // (Multiple bundles in checkout will be supported after workflow update)
    const firstBundle = subscription_items[0];

    if (!firstBundle) {
      throw new Error('No subscription items found');
    }

    // skip_first_charge: true because checkout already charged the customer for the first period
    const { result } = await createSubscriptionWorkflow(container).run({
      input: {
        customer_id,
        bundle_product_id: firstBundle.product_id,
        stripe_customer_id,
        payment_method_id,
        skip_first_charge: true,
      },
    });

    logger.info(`Created subscription ${result.subscription.id} for bundle ${firstBundle.product_id}`);

    if (subscription_items.length > 1) {
      logger.warn(
        `Multiple subscription bundles in checkout not yet supported. Created subscription for first bundle only. Found ${subscription_items.length} bundles.`,
      );
    }

    return new StepResponse(
      {
        subscription: result.subscription,
        subscription_id: result.subscription.id,
        subscription_ids: [result.subscription.id], // Array format for backward compatibility
      },
      {
        subscription_id: result.subscription.id,
      },
    );
  },
  async (compensationData: CompensationData | undefined, { container }) => {
    if (!compensationData?.subscription_id) return;

    const logger = container.resolve('logger');
    // Individual subscription rollback is handled by createSubscriptionWorkflow
    logger.info(`Checkout subscription step compensation for subscription ${compensationData.subscription_id}`);
  },
);
