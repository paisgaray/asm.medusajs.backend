import { model } from '@medusajs/framework/utils';

const WishlistItem = model.define('wishlist_item', {
  id: model.id().primaryKey(),
  wishlist_id: model.text(),
  product_id: model.text(),
  product_variant_id: model.text().nullable(),
  quantity: model.number().default(1),
});

export default WishlistItem;
