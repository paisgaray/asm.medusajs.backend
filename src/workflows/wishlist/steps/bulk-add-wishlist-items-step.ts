import { MedusaError } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';
import { upsertWishlistItem, type UpsertWishlistItemInput } from './helpers/upsert-wishlist-item';

type BulkAddWishlistItemsStepInput = {
  wishlist_id: string;
  items: UpsertWishlistItemInput[];
};

export const bulkAddWishlistItemsStep = createStep(
  'bulk-add-wishlist-items-step',
  async (input: BulkAddWishlistItemsStepInput, { container }) => {
    // Validação: verifica se há pelo menos um item válido
    if (!input.items || input.items.length === 0) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'At least one item must be provided to add to wishlist');
    }

    // Verifica se pelo menos um item tem product_variant_id
    const hasValidItem = input.items.some((item) => item?.product_variant_id);

    if (!hasValidItem) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'At least one item with product_variant_id must be provided to add to wishlist',
      );
    }

    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    // Consolida itens duplicados no array somando as quantidades
    // Se o mesmo produto aparecer múltiplas vezes no array, a quantidade final será a soma de todas
    const consolidatedItems = new Map<string, UpsertWishlistItemInput>();

    for (const item of input.items) {
      // Pula itens inválidos (sem variant_id)
      if (!item.product_variant_id) {
        continue;
      }

      // Cria uma chave única para identificar o produto (variant)
      const itemKey = `variant_${item.product_variant_id}`;

      const existing = consolidatedItems.get(itemKey);
      const incomingQuantity = item.quantity !== undefined && item.quantity !== null ? item.quantity : 1;
      const accumulatedQuantity =
        existing?.quantity !== undefined && existing.quantity !== null ? existing.quantity : 0;

      // Soma a quantidade anterior (do mesmo payload) com a nova quantidade
      consolidatedItems.set(itemKey, {
        wishlist_id: input.wishlist_id,
        product_id: item.product_id ?? existing?.product_id,
        product_variant_id: item.product_variant_id,
        quantity: accumulatedQuantity + incomingQuantity,
      });
    }

    // Processa cada item consolidado usando upsert
    // Se o produto já existe na wishlist, será sobrescrito com a nova quantidade
    const addedItems = [];

    for (const item of consolidatedItems.values()) {
      const upsertedItem = await upsertWishlistItem(wishlistService, item);
      addedItems.push(upsertedItem);
    }

    return new StepResponse({
      items: addedItems,
    });
  },
);
