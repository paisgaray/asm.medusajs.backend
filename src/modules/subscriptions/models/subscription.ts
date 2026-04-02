import { model } from '@medusajs/framework/utils';

import { SubscriptionFrequency } from '../types';
import { SubscriptionAddress } from './subscriptionAddress';

export const Subscription = model.define('subscription', {
  id: model.id().primaryKey(),
  provider: model.text(), // 'stripe', 'paypal', etc.
  provider_subscription_id: model.text(),
  provider_customer_id: model.text(),
  status: model.text().default('active'), // active, paused, cancelled, past_due, incomplete
  subscription_price: model.number(),
  currency: model.text().default('eur'),
  frequency: model.enum(Object.values(SubscriptionFrequency)).default(SubscriptionFrequency.MONTHLY),
  delivery_date: model.dateTime().nullable(),
  period: model.enum(['morning', 'afternoon', 'evening']).nullable(),
  current_period_start: model.dateTime().nullable(),
  next_billing_date: model.dateTime().nullable(),
  provider_payment_method_id: model.text().nullable(),
  payment_last4: model.text().nullable(),
  payment_brand: model.text().nullable(),
  payment_exp_month: model.number().nullable(),
  payment_exp_year: model.number().nullable(),
  metadata: model.json().nullable(),
  address: model.belongsTo(() => SubscriptionAddress, { mappedBy: 'subscription' }).nullable(),
});
