import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type UpdateWishlistStepInput = {
  wishlist_id: string;
  name?: string;
};

export const updateWishlistStep = createStep(
  'update-wishlist-step',
  async (input: UpdateWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    // Se name foi fornecido, processa o valor
    if (input.name !== undefined) {
      // Trim e valida: se vazio após trim, define como null, senão usa o valor trimmed
      const trimmedName = input.name.trim();
      const nameValue = trimmedName === '' ? null : trimmedName;

      // Atualiza a wishlist usando o método customizado que passa o ID diretamente
      await wishlistService.updateWishlistById(input.wishlist_id, {
        name: nameValue,
      });
    }

    // Recupera a wishlist atualizada para garantir que temos os dados corretos
    const wishlist = await wishlistService.retrieveWishlist(input.wishlist_id);

    return new StepResponse(wishlist);
  },
);
