import WishlistService from '../../../../modules/wishlist/service';

export type UpsertWishlistItemInput = {
  wishlist_id: string;
  product_id?: string;
  product_variant_id?: string | null;
  quantity?: number;
};

export async function upsertWishlistItem(
  wishlistService: WishlistService,
  input: UpsertWishlistItemInput,
): Promise<unknown> {
  if (!input.product_variant_id) {
    throw new Error('product_variant_id is required');
  }

  const filters: {
    wishlist_id: string;
    product_id?: string;
    product_variant_id?: string;
  } = {
    wishlist_id: input.wishlist_id,
    product_variant_id: input.product_variant_id,
  };

  if (input.product_id) {
    filters.product_id = input.product_id;
  }

  const allItems = await wishlistService.listWishlistItems(filters);

  const existingItem = allItems.find((item) => {
    const itemVariantId = item.product_variant_id || null;
    const searchVariantId = input.product_variant_id || null;
    return itemVariantId === searchVariantId;
  });

  const deltaQuantity = input.quantity !== undefined && input.quantity !== null ? input.quantity : 1;
  let item;

  if (existingItem && existingItem.id && existingItem.id.trim() !== '') {
    const currentQuantity = typeof existingItem.quantity === 'number' ? existingItem.quantity : 0;
    const newQuantity = currentQuantity + deltaQuantity;

    await wishlistService.updateWishlistItemById(existingItem.id, {
      quantity: newQuantity,
    });

    item = await wishlistService.retrieveWishlistItem(existingItem.id);
  } else {
    item = await wishlistService.createWishlistItems({
      wishlist_id: input.wishlist_id,
      product_id: input.product_id || undefined,
      product_variant_id: input.product_variant_id || undefined,
      quantity: deltaQuantity,
    });
  }

  return item;
}
