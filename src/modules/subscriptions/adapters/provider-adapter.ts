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
}
