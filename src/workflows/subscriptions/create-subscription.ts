import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { createStripeSubscriptionStep } from './steps/create-stripe-subscription';
import { createSubscriptionRecordStep } from './steps/create-subscription-record';
import { snapshotBundleItemsStep } from './steps/snapshot-bundle-items';
import { validateSubscriptionProductStep } from './steps/validate-subscription-product';

type CreateSubscriptionWorkflowInput = {
  customer_id: string;
  bundle_product_id: string;
  one_time_items?: Array<{
    price_data: {
      currency: string;
      product: string;
      unit_amount: number;
    };
    quantity: number;
  }>;
};

export const createSubscriptionWorkflow = createWorkflow(
  'create-subscription',
  (input: CreateSubscriptionWorkflowInput) => {
    // Step 1: Validate the bundle product
    const { bundle, subscription_price, currency } = validateSubscriptionProductStep({
      bundle_product_id: input.bundle_product_id,
    });

    // Step 2: Create Stripe subscription
    const stripeResult = createStripeSubscriptionStep({
      customer_id: input.customer_id,
      bundle_product_id: input.bundle_product_id,
      subscription_price,
      currency,
      one_time_items: input.one_time_items,
    });

    // Step 3: Create subscription record in database
    const { subscription } = createSubscriptionRecordStep({
      customer_id: input.customer_id,
      bundle_product_id: input.bundle_product_id,
      subscription_price,
      currency,
      stripe_subscription_id: stripeResult.stripe_subscription_id,
      stripe_customer_id: stripeResult.stripe_customer_id,
      current_period_start: stripeResult.current_period_start,
      current_period_end: stripeResult.current_period_end,
      next_billing_date: stripeResult.next_billing_date,
      status: stripeResult.status,
    });

    // Step 4: Snapshot bundle items
    snapshotBundleItemsStep({
      bundle_product_id: input.bundle_product_id,
      subscription_id: subscription.id,
    });

    return new WorkflowResponse({
      subscription,
      client_secret: stripeResult.client_secret,
    });
  },
);
