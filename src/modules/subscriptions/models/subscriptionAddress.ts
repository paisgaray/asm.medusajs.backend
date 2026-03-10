import { model } from '@medusajs/framework/utils';

import { Subscription } from './subscription';

export const SubscriptionAddress = model.define('subscription_address', {
  id: model.id().primaryKey(),
  first_name: model.text(),
  last_name: model.text(),
  address_1: model.text(),
  address_2: model.text(),
  city: model.text(),
  country_code: model.text(),
  province: model.text(),
  postal_code: model.text(),
  metadata: model.json().nullable(),
  subscription: model.hasMany(() => Subscription, { mappedBy: 'address' }),
});
