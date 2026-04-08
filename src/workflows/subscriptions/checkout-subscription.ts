import { createWorkflow, when, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

import { createCheckoutSubscriptionsStep } from './steps/create-checkout-subscriptions';
import { detectSubscriptionItemsStep } from './steps/detect-subscription-items';
import { fetchOrderForSubscriptionStep } from './steps/fetch-order-for-subscription';
import { getPaymentMethodFromOrderStep } from './steps/get-payment-method-from-order';
import { updateOrderMetadataStep } from './steps/update-order-metadata';

type CheckoutSubscriptionWorkflowInput = {
  order_id: string;
  customer_id: string;
};

/**
 * Workflow to handle subscription creation during checkout.
 * Detects subscription items by tag and creates Stripe subscriptions
 * by delegating to the existing create-subscription workflow.
 */
export const checkoutSubscriptionWorkflow = createWorkflow(
  'checkout-subscription',
  function (input: CheckoutSubscriptionWorkflowInput) {
    // Step 1: Fetch order with items
    const { order } = fetchOrderForSubscriptionStep({ order_id: input.order_id });

    // Step 2: Detect subscription items by 'subscription' tag
    const { has_subscriptions, subscription_items } = detectSubscriptionItemsStep({ order });

    // Step 3: Get payment method from order (only if subscriptions exist)
    const paymentMethodData = when({ has_subscriptions }, ({ has_subscriptions }) => has_subscriptions).then(() => {
      return getPaymentMethodFromOrderStep({ order });
    });

    // Step 4: Create subscriptions via existing create-subscription workflow
    // Passes stripe_customer_id and payment_method_id
    // The create-subscription workflow will handle customer creation and payment method attachment
    const subscriptionData = when({ has_subscriptions }, ({ has_subscriptions }) => has_subscriptions).then(() => {
      return createCheckoutSubscriptionsStep({
        customer_id: input.customer_id,
        subscription_items,
        order_id: input.order_id,
        payment_provider_id: paymentMethodData.payment_provider_id,
        payment_customer_id: paymentMethodData.payment_customer_id,
        payment_method_id: paymentMethodData.payment_method_id,
        order,
      });
    });

    // Step 5: Update order metadata with subscription references
    when({ has_subscriptions }, ({ has_subscriptions }) => has_subscriptions).then(() => {
      return updateOrderMetadataStep({
        order_id: input.order_id,
        subscription_ids: subscriptionData.subscription_ids,
      });
    });

    return new WorkflowResponse({
      has_subscriptions,
      subscription_ids: subscriptionData?.subscription_ids,
    });
  },
);
