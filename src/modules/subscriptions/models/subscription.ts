import { model } from '@medusajs/framework/utils';

import { SubscriptionBundle } from './subscription-bundle';
import { SubscriptionItem } from './subscription-item';

export const Subscription = model.define('subscription', {
  id: model.id().primaryKey(),
  provider: model.text(), // 'stripe', 'paypal', etc.
  provider_subscription_id: model.text(),
  provider_customer_id: model.text(),
  status: model.text().default('active'), // active, paused, cancelled, past_due, incomplete
  subscription_price: model.number(),
  currency: model.text().default('usd'),
  // current_period_start: model.dateTime(),
  // current_period_end: model.dateTime(),
  // next_billing_date: model.dateTime(),
  metadata: model.json().nullable(),
  bundles: model.hasMany(() => SubscriptionBundle, {
    mappedBy: 'subscription',
  }),
  items: model.hasMany(() => SubscriptionItem, {
    mappedBy: 'subscription',
  }),
});
