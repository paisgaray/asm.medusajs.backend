import { model } from '@medusajs/framework/utils';

import { Subscription } from './subscription';

export const SubscriptionInvoice = model.define('subscription_invoice', {
  id: model.id().primaryKey(),
  current_subscription_billing_date: model.dateTime(),
  billing_date: model.dateTime(),
  amount: model.number(),
  subscription: model.belongsTo(() => Subscription, { mappedBy: 'invoices' }),
  metadata: model.json().nullable(),
});
