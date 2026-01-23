import { model } from '@medusajs/framework/utils';

const Wishlist = model.define('wishlist', {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  name: model.text().nullable(),
  share_token: model.text().default(''),
});

export default Wishlist;
