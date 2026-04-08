import { SubscriptionProvider } from '../types';
import { GPSubscriptionAdapter } from './gp-adapter';
import { SubscriptionProviderAdapter } from './provider-adapter';
import { StripeSubscriptionAdapter } from './stripe-adapter';

const adapters: Record<string, () => SubscriptionProviderAdapter> = {
  stripe: () => new StripeSubscriptionAdapter(),
  [SubscriptionProvider.STRIPE]: () => new StripeSubscriptionAdapter(),
  [SubscriptionProvider.GLOBAL_PAYMENTS]: () => new GPSubscriptionAdapter(),
};

export function getProviderAdapter(provider: SubscriptionProvider): SubscriptionProviderAdapter {
  const factory = adapters[provider];
  if (!factory) throw new Error(`No subscription adapter registered for provider: "${provider}"`);
  return factory();
}

export type { SubscriptionProviderAdapter } from './provider-adapter';
