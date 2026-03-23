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
}
