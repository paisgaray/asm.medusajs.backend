export interface SubscriptionProviderAdapter {
  skipNextPayment(providerSubscriptionId: string, resumesAt: Date): Promise<void>;
  rollbackSkip(providerSubscriptionId: string): Promise<void>;
  updatePrice(
    providerSubscriptionId: string,
    newAmountInCents: number,
    currency: string,
    frequency: string,
  ): Promise<void>;
  rollbackUpdatePrice(
    providerSubscriptionId: string,
    previousAmountInCents: number,
    currency: string,
    frequency: string,
  ): Promise<void>;
  updateFrequency(
    providerSubscriptionId: string,
    newFrequency: string,
    newNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }>;
  rollbackUpdateFrequency(
    newProviderSubscriptionId: string,
    previousFrequency: string,
    previousNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }>;
}
