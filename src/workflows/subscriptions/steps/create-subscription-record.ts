import { OrderDTO } from '@medusajs/framework/types';
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
  status: string;
  current_period_start?: Date;
  next_billing_date?: Date;
  provider_payment_method_id?: string | null;
  payment_last4?: string | null;
  payment_brand?: string | null;
  payment_exp_month?: number | null;
  payment_exp_year?: number | null;
  frequency: string;
  order: OrderDTO;
  address_id: string;
};

export const createSubscriptionRecordStep = createStep(
  'create-subscription-record',
  async (input: CreateSubscriptionRecordStepInput, { container }) => {
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);

    const subscription = await subscriptionService.createSubscriptions({
      provider: SubscriptionProvider.STRIPE,
      provider_subscription_id: input.stripe_subscription_id,
      provider_customer_id: input.stripe_customer_id,
      subscription_price: input.subscription_price,
      currency: input.currency,
      status: input.status as SubscriptionStatus,
      current_period_start: input.current_period_start,
      next_billing_date: input.next_billing_date,
      provider_payment_method_id: input.provider_payment_method_id,
      payment_last4: input.payment_last4,
      payment_brand: input.payment_brand,
      payment_exp_month: input.payment_exp_month,
      payment_exp_year: input.payment_exp_year,
      period: input.order.metadata?.period as any,
      periodDate: input.order.metadata?.periodDate as any,
      frequency: input.frequency as any,
      address_id: input.address_id,
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
