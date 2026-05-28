import { CustomerDTO } from '@medusajs/framework/types';

import { CreatePaymentSubscriptionStepInput } from './type';

export type PreparePaymentMethodDataContext = {
  customer_id?: string;
  metadata?: Record<string, unknown>;
};

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
  getOrCreatePaymentCustomer(customer_id: string): Promise<{
    paymentCustomerId: string;
    wasCreated: boolean;
    customer: CustomerDTO;
  }>;
  attachPaymentMethod(
    payment_method_id: string,
    payment_customer_id: string,
  ): Promise<{
    payment_method_id: string;
    paymentMethod: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
  }>;
  getsertPaymentProduct(
    product_name: string,
    medusa_product_id: string,
    metadata?: Record<string, string>,
  ): Promise<{
    paymentProductId: string;
    wasCreated: boolean;
  }>;
  createPaymentSubscription(input: CreatePaymentSubscriptionStepInput): Promise<{
    subscription: { id: string; status: string };
    periodStart: number;
    periodEnd: number;
  }>;
  preparePaymentMethodData(token: string, context?: PreparePaymentMethodDataContext): Promise<Record<string, unknown>>;
  /**
   * Returns an updated account holder data object to persist locally (e.g. for providers
   * that have no external payment method storage API). Return null if no local persistence
   * is needed (e.g. Stripe handles storage externally).
   */
  persistPaymentMethodLocally(
    currentAccountHolderData: Record<string, unknown>,
    paymentMethodId: string,
    paymentMethodData: Record<string, unknown>,
  ): Record<string, unknown> | null;
  /**
   * Returns an updated account holder data object with the payment method removed.
   * Return null if no local removal is needed (e.g. Stripe stores externally).
   */
  removePaymentMethodLocally(
    currentAccountHolderData: Record<string, unknown>,
    paymentMethodId: string,
  ): Record<string, unknown> | null;
}
