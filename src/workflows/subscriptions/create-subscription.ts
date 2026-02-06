import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { createStripeSubscriptionStep } from './steps/create-stripe-subscription';
import { createSubscriptionRecordStep } from './steps/create-subscription-record';
import { getOrCreateStripeCustomerStep } from './steps/get-or-create-stripe-customer';
import { getsertStripeProductStep } from './steps/getsert-stripe-product';
import { prepareOneTimeItemsStep } from './steps/prepare-one-time-items';
import { snapshotBundleItemsStep } from './steps/snapshot-bundle-items';
import { validateSubscriptionProductStep } from './steps/validate-subscription-product';

type CreateSubscriptionWorkflowInput = {
  customer_id: string;
  bundle_product_id: string;
  one_time_product_ids?: Array<{
    product_id: string;
    variant_id: string;
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

    // Step 2: Get or create Stripe customer
    const { stripe_customer_id } = getOrCreateStripeCustomerStep({
      customer_id: input.customer_id,
    });

    // Step 3: Get or create Stripe product for the bundle
    const { stripe_product_id } = getsertStripeProductStep({
      product_name: bundle.title,
      medusa_product_id: bundle.id,
      metadata: {
        medusa_bundle_id: bundle.id,
      },
    });

    // Step 4: Prepare one-time items (fetch products and create in Stripe)
    const { one_time_items } = prepareOneTimeItemsStep({
      one_time_product_ids: input.one_time_product_ids,
      currency,
    });

    // Step 5: Create Stripe subscription
    const stripeResult = createStripeSubscriptionStep({
      stripe_customer_id,
      stripe_product_id,
      subscription_price,
      currency,
      one_time_items,
    });

    // Step 6: Create subscription record in database
    const { subscription } = createSubscriptionRecordStep({
      customer_id: input.customer_id,
      bundle_product_id: input.bundle_product_id,
      subscription_price,
      currency,
      stripe_subscription_id: stripeResult.stripe_subscription_id,
      stripe_customer_id,
      status: stripeResult.status,
    });

    // Step 7: Snapshot bundle items
    snapshotBundleItemsStep({
      bundle_product_id: input.bundle_product_id,
      subscription_id: subscription.id,
    });

    return new WorkflowResponse({
      subscription,
      // client_secret: stripeResult.client_secret,
    });
  },
);
