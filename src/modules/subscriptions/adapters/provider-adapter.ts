export interface SubscriptionProviderAdapter {
  skipNextPayment(providerSubscriptionId: string, resumesAt: Date): Promise<void>;
  rollbackSkip(providerSubscriptionId: string): Promise<void>;
  detachPaymentMethod(paymentMethodId: string): Promise<void>;
  updatePaymentMethod(
    paymentMethodId: string,
    params: { billing_details?: Record<string, unknown>; metadata?: Record<string, unknown> },
  ): Promise<void>;
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
  updateDeliveryDate(
    providerSubscriptionId: string,
    frequency: string,
    newNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }>;
  rollbackUpdateDeliveryDate(
    newProviderSubscriptionId: string,
    frequency: string,
    previousNextBillingDate: Date,
  ): Promise<{ new_provider_subscription_id: string }>;
  changeSubscriptionPaymentMethod(providerSubscriptionId: string, paymentMethodId: string): Promise<void>;
}
