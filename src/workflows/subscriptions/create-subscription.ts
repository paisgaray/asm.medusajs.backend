import { createWorkflow, transform, when, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { attachPaymentMethodStep } from './steps/attach-payment-method';
import { createBundleProductLinkStep } from './steps/create-bundle-product-link';
import { createItemLinksStep } from './steps/create-item-links';
import { createStripeSubscriptionStep } from './steps/create-stripe-subscription';
import { createSubscriptionBundleStep } from './steps/create-subscription-bundle';
import { createSubscriptionCustomerLinkStep } from './steps/create-subscription-customer-link';
import { createSubscriptionRecordStep } from './steps/create-subscription-record';
import { getOrCreateStripeCustomerStep } from './steps/get-or-create-stripe-customer';
import { getsertStripeProductStep } from './steps/getsert-stripe-product';
import { snapshotBundleItemsStep } from './steps/snapshot-bundle-items';
import { validateSubscriptionProductStep } from './steps/validate-subscription-product';

type CreateSubscriptionWorkflowInput = {
  customer_id: string;
  bundle_product_id: string;
  /** Pass this to skip the getOrCreateStripeCustomer step (e.g. checkout already resolved it) */
  stripe_customer_id?: string;
  /** When true, first payment was handled by checkout. Subscription starts billing next month. */
  skip_first_charge?: boolean;
  /** Payment method to attach to customer (only used if customer needs to be created) */
  payment_method_id?: string;
};

export const createSubscriptionWorkflow = createWorkflow(
  'create-subscription',
  (input: CreateSubscriptionWorkflowInput) => {
    // Step 1: Validate the bundle product
    const { bundle, subscription_price, currency } = validateSubscriptionProductStep({
      bundle_product_id: input.bundle_product_id,
    });

    // Step 2: Get or create Stripe customer (skip if already provided)
    const customerResult = when(
      { stripe_customer_id: input.stripe_customer_id },
      ({ stripe_customer_id }) => !stripe_customer_id,
    ).then(() => {
      return getOrCreateStripeCustomerStep({
        customer_id: input.customer_id,
      });
    });

    // Resolve the final stripe_customer_id: use provided or fetched
    const resolvedCustomer = transform(
      {
        provided: input.stripe_customer_id,
        fetched: customerResult?.stripe_customer_id,
      },
      (data) => ({
        stripe_customer_id: data.provided || data.fetched,
      }),
    );

    // Step 3: Attach payment method if provided (must happen before creating subscription)
    when({ payment_method_id: input.payment_method_id }, ({ payment_method_id }) => !!payment_method_id).then(() => {
      return attachPaymentMethodStep({
        payment_method_id: input.payment_method_id!,
        stripe_customer_id: resolvedCustomer.stripe_customer_id,
      });
    });

    // Step 4: Get or create Stripe product for the bundle
    const { stripe_product_id } = getsertStripeProductStep({
      product_name: bundle.title,
      medusa_product_id: bundle.id,
      metadata: {
        medusa_bundle_id: bundle.id,
      },
    });

    // Step 4: Create Stripe subscription
    const stripeResult = createStripeSubscriptionStep({
      stripe_customer_id: resolvedCustomer.stripe_customer_id,
      stripe_product_id,
      subscription_price,
      currency,
      skip_first_charge: input.skip_first_charge,
    });

    // Step 6: Create subscription record in database
    const subscriptionData = createSubscriptionRecordStep({
      customer_id: input.customer_id,
      bundle_product_id: input.bundle_product_id,
      subscription_price,
      currency,
      stripe_subscription_id: stripeResult.stripe_subscription_id,
      stripe_customer_id: resolvedCustomer.stripe_customer_id,
      status: stripeResult.status,
    });

    // Step 7: Link subscription to customer
    createSubscriptionCustomerLinkStep({
      subscription_id: subscriptionData.subscription.id,
      customer_id: subscriptionData.customer_id,
    });

    // Step 8: Create SubscriptionBundle record
    const subscriptionBundle = createSubscriptionBundleStep({
      subscription_id: subscriptionData.subscription.id,
      bundle_price: subscription_price,
      metadata: {
        bundle_id: bundle.id,
        bundle_title: bundle.title,
        created_at: new Date().toISOString(),
      },
    });

    // Step 9: Link bundle to product
    createBundleProductLinkStep({
      subscription_bundle_id: subscriptionBundle.id,
      product_id: subscriptionData.bundle_product_id,
    });

    // Step 10: Snapshot bundle items
    const itemsData = snapshotBundleItemsStep({
      bundle_id: bundle.id,
      subscription_id: subscriptionData.subscription.id,
      subscription_bundle_id: subscriptionBundle.id,
    });

    // Step 11: Link items to products and variants
    createItemLinksStep({
      subscription_items: itemsData.subscription_items,
      product_ids: itemsData.product_ids,
      variant_ids: itemsData.variant_ids,
    });

    return new WorkflowResponse({
      subscription: subscriptionData.subscription,
      // client_secret: stripeResult.client_secret,
    });
  },
);
