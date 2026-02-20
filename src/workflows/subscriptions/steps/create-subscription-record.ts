import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import SubscriptionModuleService from '../../../modules/subscriptions/service';
import { SubscriptionProvider, SubscriptionStatus } from '../../../modules/subscriptions/types';

type CreateSubscriptionRecordStepInput = {
  customer_id: string;
  bundle_product_id: string;
  subscription_price: number;
  currency: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  // current_period_start: Date;
  // current_period_end: Date;
  // next_billing_date: Date;
  status: string;
};

export const createSubscriptionRecordStep = createStep(
  'create-subscription-record',
  async (input: CreateSubscriptionRecordStepInput, { container }) => {
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    // Create subscription without customer_id and bundle_product_id (handled via Links)
    const subscription = await subscriptionService.createSubscriptions({
      provider: SubscriptionProvider.STRIPE,
      provider_subscription_id: input.stripe_subscription_id,
      provider_customer_id: input.stripe_customer_id,
      subscription_price: input.subscription_price,
      currency: input.currency,
      status: input.status as SubscriptionStatus,
    });

    // Return subscription and IDs needed for creating links
    return new StepResponse(
      {
        subscription,
        customer_id: input.customer_id,
        bundle_product_id: input.bundle_product_id,
      },
      { subscription_id: subscription.id },
    );
  },
  async (data, { container }) => {
    if (!data?.subscription_id) {
      return;
    }

    // Rollback: delete the subscription record
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);
    await subscriptionService.deleteSubscriptions([data.subscription_id]);
  },
);
