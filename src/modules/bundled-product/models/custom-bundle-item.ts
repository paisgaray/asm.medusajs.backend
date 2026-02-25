import { model } from '@medusajs/framework/utils';

import { CustomBundle } from './custom-bundle';

export const CustomBundleItem = model.define('custom_bundle_item', {
  id: model.id().primaryKey(),
  type: model.enum(['single', 'bundle']).default('single'),
  quantity: model.number().default(1),
  item_price: model.number(),
  product_snapshot: model.json(),
  bundle: model
    .belongsTo(() => CustomBundle, {
      mappedBy: 'items',
    })
    .nullable(),
});
