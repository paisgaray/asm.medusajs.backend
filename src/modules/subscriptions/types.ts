export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due',
  INCOMPLETE = 'incomplete',
}

export enum SubscriptionProvider {
  STRIPE = 'stripe',
}

export interface CreateSubscriptionInput {
  customer_id: string;
  bundle_product_id: string;
  provider: SubscriptionProvider;
  provider_subscription_id: string;
  provider_customer_id: string;
  subscription_price: number;
  currency: string;
  current_period_start: Date;
  current_period_end: Date;
  next_billing_date: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubscriptionInput {
  status?: SubscriptionStatus;
  current_period_start?: Date;
  current_period_end?: Date;
  next_billing_date?: Date;
  metadata?: Record<string, unknown>;
}

export interface SubscriptionItemSnapshot {
  product_id: string;
  variant_id: string;
  product_title: string;
  variant_title?: string;
  quantity: number;
  unit_price?: number;
}
