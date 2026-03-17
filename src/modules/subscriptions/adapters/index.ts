import { SubscriptionProviderAdapter } from './provider-adapter';
import { StripeSubscriptionAdapter } from './stripe-adapter';

const adapters: Record<string, () => SubscriptionProviderAdapter> = {
  stripe: () => new StripeSubscriptionAdapter(),
  // paypal: () => new PaypalSubscriptionAdapter(),
};

export function getProviderAdapter(provider: string): SubscriptionProviderAdapter {
  const factory = adapters[provider];
  if (!factory) {
    throw new Error(`No subscription adapter registered for provider: "${provider}"`);
  }
  return factory();
}

export type { SubscriptionProviderAdapter } from './provider-adapter';
