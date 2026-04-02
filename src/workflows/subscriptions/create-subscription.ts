import { OrderDTO } from '@medusajs/framework/types';
import { createWorkflow, transform, when, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { SubscriptionProvider } from '../../modules/subscriptions';
import { attachPaymentMethodStep } from './steps/attach-payment-method';
import { createPaymentSubscriptionStep } from './steps/create-payment-subscription';
import { createSubscriptionAddressStep } from './steps/create-subscription-address';
import { createSubscriptionBundleLinkStep } from './steps/create-subscription-bundle-link';
import { createSubscriptionCustomerLinkStep } from './steps/create-subscription-customer-link';
import { createSubscriptionRecordStep } from './steps/create-subscription-record';
import { getOrCreatePaymentCustomerStep } from './steps/get-or-create-payment-customer';
import { getsertPaymentProductStep } from './steps/getsert-payment-product';
import { validateSubscriptionProductStep } from './steps/validate-subscription-product';

type CreateSubscriptionWorkflowInput = {
  customer_id: string;
  bundle_product_id: string;
  payment_provider_id: SubscriptionProvider;
  /** Pass this to skip the getOrCreateStripeCustomer step (e.g. checkout already resolved it) */
  payment_customer_id?: string;
  /** When true, first payment was handled by checkout. Subscription starts billing next month. */
  skip_first_charge?: boolean;
  /** Payment method to attach to customer (only used if customer needs to be created) */
  payment_method_id?: string;
  /** How often the subscription renews (from line item metadata) */
  frequency?: string;
  order?: OrderDTO;
  metadata: Record<string, unknown>;
};

export const createSubscriptionWorkflow = createWorkflow(
  'create-subscription',
  (input: CreateSubscriptionWorkflowInput) => {
    // Step 1: Validate the bundle product
    const { bundle, product_title, subscription_price, currency } = validateSubscriptionProductStep({
      bundle_product_id: input.bundle_product_id,
    });

    // Step 2: Get or create Stripe customer (skip if already provided)
    const customerResult = when(
      { payment_customer_id: input.payment_customer_id },
      ({ payment_customer_id }) => !payment_customer_id,
    ).then(() => {
      return getOrCreatePaymentCustomerStep({
        payment_provider_id: input.payment_provider_id,
        customer_id: input.customer_id,
      });
    });

    // Resolve the final stripe_customer_id: use provided or fetched
    const resolvedCustomer = transform(
      { provided: input.payment_customer_id, fetched: customerResult?.payment_customer_id },
      (data) => ({ payment_customer_id: data.provided || data.fetched }),
    );

    // Step 3: Attach payment method if provided (must happen before creating subscription)
    const paymentMethodData = when(
      { payment_method_id: input.payment_method_id },
      ({ payment_method_id }) => !!payment_method_id,
    ).then(() => {
      return attachPaymentMethodStep({
        payment_provider_id: input.payment_provider_id,
        payment_method_id: input.payment_method_id,
        payment_customer_id: resolvedCustomer.payment_customer_id,
      });
    });

    // Step 4: Get or create Stripe product for the bundle
    const { payment_product_id } = getsertPaymentProductStep({
      payment_provider_id: input.payment_provider_id,
      product_name: product_title,
      medusa_product_id: bundle.id,
      metadata: { medusa_bundle_id: bundle.id },
    });

    // Step 4: Create Stripe subscription
    const paymentSubscription = createPaymentSubscriptionStep({
      payment_provider_id: input.payment_provider_id,
      payment_customer_id: resolvedCustomer.payment_customer_id,
      payment_product_id,
      subscription_price,
      currency,
      skip_first_charge: input.skip_first_charge,
      metadata: input.metadata,
    });

    // Resolve payment method card data (may be null if not provided)
    const resolvedPaymentMethod = transform(
      { pmData: paymentMethodData, pmId: input.payment_method_id },
      ({ pmData, pmId }) => ({
        provider_payment_method_id: pmData?.payment_method_id ?? pmId ?? null,
        payment_last4: pmData?.last4 ?? null,
        payment_brand: pmData?.brand ?? null,
        payment_exp_month: pmData?.exp_month ?? null,
        payment_exp_year: pmData?.exp_year ?? null,
      }),
    );

    const { subscriptionAddress } = createSubscriptionAddressStep({ order: input.order });

    // Step 6: Create subscription record in database
    const subscriptionData = createSubscriptionRecordStep({
      payment_provider_id: input.payment_provider_id,
      customer_id: input.customer_id,
      bundle_product_id: input.bundle_product_id,
      subscription_price,
      currency,
      frequency: input.frequency,
      order: input.order,
      address_id: subscriptionAddress.id,
      stripe_customer_id: resolvedCustomer.payment_customer_id,
      stripe_subscription_id: paymentSubscription.payment_subscription_id,
      status: paymentSubscription.status,
      current_period_start: paymentSubscription.current_period_start,
      next_billing_date: paymentSubscription.next_billing_date,
      provider_payment_method_id: resolvedPaymentMethod.provider_payment_method_id,
      payment_last4: resolvedPaymentMethod.payment_last4,
      payment_brand: resolvedPaymentMethod.payment_brand,
      payment_exp_month: resolvedPaymentMethod.payment_exp_month,
      payment_exp_year: resolvedPaymentMethod.payment_exp_year,
    });

    // Step 7: Link subscription to customer
    createSubscriptionCustomerLinkStep({
      subscription_id: subscriptionData.subscription.id,
      customer_id: subscriptionData.customer_id,
    });

    // Step 8: Link subscription to custom bundle
    createSubscriptionBundleLinkStep({
      subscription_id: subscriptionData.subscription.id,
      custom_bundle_id: input.metadata.custom_bundle_id as string,
    });

    return new WorkflowResponse({
      subscription: subscriptionData.subscription,
    });
  },
);
