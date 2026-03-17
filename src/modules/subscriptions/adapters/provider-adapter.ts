export interface SubscriptionProviderAdapter {
  skipNextPayment(providerSubscriptionId: string, resumesAt: Date): Promise<void>;
  rollbackSkip(providerSubscriptionId: string): Promise<void>;
}
