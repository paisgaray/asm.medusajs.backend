import Stripe from 'stripe';

import { SubscriptionProviderAdapter } from './provider-adapter';

export class StripeSubscriptionAdapter implements SubscriptionProviderAdapter {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_API_KEY!);
  }

  private getRecurring(frequency: string): Stripe.SubscriptionUpdateParams.Item.PriceData.Recurring {
    switch (frequency) {
      case 'weekly':
        return { interval: 'week' };
      case 'biweekly':
        return { interval: 'week', interval_count: 2 };
      default:
        return { interval: 'month' };
    }
  }

  async skipNextPayment(providerSubscriptionId: string, resumesAt: Date): Promise<void> {
    await this.stripe.subscriptions.update(providerSubscriptionId, {
      pause_collection: {
        behavior: 'void',
        resumes_at: Math.floor(resumesAt.getTime() / 1000),
      },
    });
  }

  async rollbackSkip(providerSubscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(providerSubscriptionId, {
      pause_collection: null,
    });
  }

  async updatePrice(
    providerSubscriptionId: string,
    newAmountInCents: number,
    currency: string,
    frequency: string,
  ): Promise<void> {
    const sub = await this.stripe.subscriptions.retrieve(providerSubscriptionId);
    const item = sub.items.data[0];
    const productId = typeof item.price.product === 'string' ? item.price.product : item.price.product.id;

    await this.stripe.subscriptions.update(providerSubscriptionId, {
      items: [
        {
          id: item.id,
          price_data: {
            currency,
            product: productId,
            unit_amount: newAmountInCents,
            recurring: this.getRecurring(frequency),
          },
        },
      ],
      proration_behavior: 'none',
    });
  }

  async rollbackUpdatePrice(
    providerSubscriptionId: string,
    previousAmountInCents: number,
    currency: string,
    frequency: string,
  ): Promise<void> {
    await this.updatePrice(providerSubscriptionId, previousAmountInCents, currency, frequency);
  }

  private async recreateSubscription(
    providerSubscriptionId: string,
    frequency: string,
    nextBillingDate: Date,
  ): Promise<string> {
    const sub = await this.stripe.subscriptions.retrieve(providerSubscriptionId, {
      expand: ['default_payment_method'],
    });
    const item = sub.items.data[0];
    const productId = typeof item.price.product === 'string' ? item.price.product : item.price.product.id;
    const paymentMethodId =
      typeof sub.default_payment_method === 'string' ? sub.default_payment_method : sub.default_payment_method?.id;

    await this.stripe.subscriptions.cancel(providerSubscriptionId);

    const newSub = await this.stripe.subscriptions.create({
      customer: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      default_payment_method: paymentMethodId,
      items: [
        {
          price_data: {
            currency: sub.currency,
            product: productId,
            unit_amount: item.price.unit_amount ?? 0,
            recurring: this.getRecurring(frequency),
          },
        },
      ],
      billing_cycle_anchor: Math.floor(nextBillingDate.getTime() / 1000),
      proration_behavior: 'none',
    });

    return newSub.id;
  }

  async updateFrequency(
    providerSubscriptionId: string,
    newFrequency: string,
    newNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }> {
    const sub = await this.stripe.subscriptions.retrieve(providerSubscriptionId);
    const item = sub.items.data[0];
    const targetRecurring = this.getRecurring(newFrequency);
    const currentRecurring = item.price.recurring;

    // If the interval already matches, nothing to do in Stripe.
    const isSameInterval =
      currentRecurring?.interval === targetRecurring.interval &&
      (currentRecurring?.interval_count ?? 1) === (targetRecurring.interval_count ?? 1);

    if (isSameInterval) {
      return { new_provider_subscription_id: providerSubscriptionId };
    }

    const newSubId = await this.recreateSubscription(providerSubscriptionId, newFrequency, newNextBillingDate);
    return { new_provider_subscription_id: newSubId };
  }

  async rollbackUpdateFrequency(
    newProviderSubscriptionId: string,
    previousFrequency: string,
    previousNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }> {
    const newSubId = await this.recreateSubscription(
      newProviderSubscriptionId,
      previousFrequency,
      previousNextBillingDate,
    );
    return { new_provider_subscription_id: newSubId };
  }

  async updateDeliveryDate(
    providerSubscriptionId: string,
    frequency: string,
    newNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }> {
    const newSubId = await this.recreateSubscription(providerSubscriptionId, frequency, newNextBillingDate);
    return { new_provider_subscription_id: newSubId };
  }

  async rollbackUpdateDeliveryDate(
    newProviderSubscriptionId: string,
    frequency: string,
    previousNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }> {
    const newSubId = await this.recreateSubscription(newProviderSubscriptionId, frequency, previousNextBillingDate);
    return { new_provider_subscription_id: newSubId };
  }

  async changeSubscriptionPaymentMethod(providerSubscriptionId: string, paymentMethodId: string): Promise<void> {
    await this.stripe.subscriptions.update(providerSubscriptionId, {
      default_payment_method: paymentMethodId,
    });
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  async updatePaymentMethod(
    paymentMethodId: string,
    params: { billing_details?: Record<string, unknown>; metadata?: Record<string, unknown> },
  ): Promise<void> {
    await this.stripe.paymentMethods.update(paymentMethodId, {
      ...(params.billing_details && {
        billing_details: params.billing_details as Stripe.PaymentMethodUpdateParams['billing_details'],
      }),
      ...(params.metadata && { metadata: params.metadata as Stripe.Emptyable<Stripe.MetadataParam> }),
    });
  }
}
