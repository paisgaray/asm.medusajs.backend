import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import Stripe from 'stripe';

import { SUBSCRIPTION_MODULE } from '../../../modules/subscriptions';
import { getProviderAdapter } from '../../../modules/subscriptions/adapters';
import SubscriptionModuleService from '../../../modules/subscriptions/service';

type UpdateSubscriptionPaymentMethodStepInput = {
  id: string;
  payment_method_id: string;
  set_as_default: boolean;
};

type CompensationData = {
  id: string;
  provider: string;
  provider_subscription_id: string;
  provider_customer_id: string;
  previous_payment_method_id: string | null;
  previous_payment_last4: string | null;
  previous_payment_brand: string | null;
  previous_payment_exp_month: number | null;
  previous_payment_exp_year: number | null;
  set_as_default: boolean;
};

export const updateSubscriptionPaymentMethodStep = createStep(
  'update-subscription-payment-method',
  async (input: UpdateSubscriptionPaymentMethodStepInput, { container }) => {
    const logger = container.resolve('logger');
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);
    const stripe = new Stripe(process.env.STRIPE_API_KEY!);

    const existing = await subscriptionService.retrieveSubscription(input.id);
    const { provider, provider_subscription_id, provider_customer_id } = existing;

    // Retrieve PM from Stripe — verify it exists and extract card details server-side (never trust frontend)
    const paymentMethod = await stripe.paymentMethods.retrieve(input.payment_method_id);

    // Attach to customer if not already done
    if (paymentMethod.customer === provider_customer_id) {
      logger.info(`Payment method ${input.payment_method_id} already attached to customer ${provider_customer_id}`);
    } else if (paymentMethod.customer && paymentMethod.customer !== provider_customer_id) {
      throw new Error(
        `Payment method ${input.payment_method_id} is attached to a different Stripe customer: ${paymentMethod.customer}`,
      );
    } else {
      await stripe.paymentMethods.attach(input.payment_method_id, {
        customer: provider_customer_id,
      });
      logger.info(`Payment method ${input.payment_method_id} attached to customer ${provider_customer_id}`);
    }

    // Optionally set as customer-level default (affects all subscriptions for this customer)
    if (input.set_as_default) {
      await stripe.customers.update(provider_customer_id, {
        invoice_settings: { default_payment_method: input.payment_method_id },
      });
      logger.info(`Payment method ${input.payment_method_id} set as customer-level default`);
    }

    // Always set as subscription-level default (only this subscription)
    const adapter = getProviderAdapter(provider);
    await adapter.changeSubscriptionPaymentMethod(provider_subscription_id, input.payment_method_id);
    logger.info(
      `Payment method ${input.payment_method_id} set as subscription-level default for ${provider_subscription_id}`,
    );

    const last4 = paymentMethod.card?.last4 ?? null;
    const brand = paymentMethod.card?.brand ?? null;
    const exp_month = paymentMethod.card?.exp_month ?? null;
    const exp_year = paymentMethod.card?.exp_year ?? null;

    // Persist updated payment fields on the subscription record
    await subscriptionService.updateSubscriptions({
      id: input.id,
      provider_payment_method_id: input.payment_method_id,
      payment_last4: last4,
      payment_brand: brand,
      payment_exp_month: exp_month,
      payment_exp_year: exp_year,
    });

    return new StepResponse(
      {
        payment_method_id: input.payment_method_id,
        last4,
        brand,
        exp_month,
        exp_year,
      },
      {
        id: input.id,
        provider,
        provider_subscription_id,
        provider_customer_id,
        previous_payment_method_id: existing.provider_payment_method_id ?? null,
        previous_payment_last4: existing.payment_last4 ?? null,
        previous_payment_brand: existing.payment_brand ?? null,
        previous_payment_exp_month: existing.payment_exp_month ?? null,
        previous_payment_exp_year: existing.payment_exp_year ?? null,
        set_as_default: input.set_as_default,
      } satisfies CompensationData,
    );
  },
  async (data: CompensationData, { container }) => {
    if (!data?.previous_payment_method_id) return;

    const logger = container.resolve('logger');
    const subscriptionService: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE);
    const stripe = new Stripe(process.env.STRIPE_API_KEY!);

    try {
      const adapter = getProviderAdapter(data.provider);

      // Revert subscription-level default
      await adapter.changeSubscriptionPaymentMethod(data.provider_subscription_id, data.previous_payment_method_id);

      // Revert customer-level default only if we changed it
      if (data.set_as_default) {
        await stripe.customers.update(data.provider_customer_id, {
          invoice_settings: {
            default_payment_method: data.previous_payment_method_id,
          },
        });
      }

      // Revert DB record
      await subscriptionService.updateSubscriptions({
        id: data.id,
        provider_payment_method_id: data.previous_payment_method_id,
        payment_last4: data.previous_payment_last4,
        payment_brand: data.previous_payment_brand,
        payment_exp_month: data.previous_payment_exp_month,
        payment_exp_year: data.previous_payment_exp_year,
      });
    } catch (error: any) {
      logger.error(`Failed to rollback subscription payment method update: ${error.message}`);
    }
  },
);
