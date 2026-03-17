import Stripe from 'stripe';

import { SubscriptionProviderAdapter } from './provider-adapter';

export class StripeSubscriptionAdapter implements SubscriptionProviderAdapter {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_API_KEY!);
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
}
