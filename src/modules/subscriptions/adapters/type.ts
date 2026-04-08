import { SubscriptionProvider } from '../types';

export type CreatePaymentSubscriptionStepInput = {
  payment_provider_id: SubscriptionProvider;
  payment_customer_id: string;
  payment_product_id: string;
  subscription_price: number;
  currency: string;
  skip_first_charge?: boolean;
  metadata: Record<string, unknown>;
};
