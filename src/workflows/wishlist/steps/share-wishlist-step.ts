import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { randomBytes } from 'crypto';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';

type ShareWishlistStepInput = {
  wishlist_id: string;
};

export const shareWishlistStep = createStep(
  'share-wishlist-step',
  async (input: ShareWishlistStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    // Gera um token único de compartilhamento
    // Verifica se o token já existe e gera um novo se necessário (extremamente raro)
    let shareToken: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      shareToken = randomBytes(32).toString('hex');
      const existingWishlists = await wishlistService.listWishlists({
        share_token: shareToken,
      });

      // Se não encontrou wishlist com esse token, podemos usar
      if (existingWishlists.length === 0) {
        break;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique share token after multiple attempts');
      }
    } while (attempts < maxAttempts);

    // Recupera a wishlist atual
    const currentWishlist = await wishlistService.retrieveWishlist(input.wishlist_id);

    // Se a wishlist já tem um share_token, usa ele. Caso contrário, atualiza com o novo token
    if (currentWishlist.share_token && currentWishlist.share_token.trim() !== '') {
      shareToken = currentWishlist.share_token;
    } else {
      // Atualiza apenas o share_token da wishlist existente usando método customizado
      await wishlistService.updateWishlistById(input.wishlist_id, {
        share_token: shareToken,
      });
    }

    // Busca a wishlist atualizada com os itens
    const updatedWishlist = await wishlistService.retrieveWishlist(input.wishlist_id);
    const items = await wishlistService.listWishlistItems({
      wishlist_id: input.wishlist_id,
    });

    return new StepResponse({
      share_token: shareToken,
      wishlist_id: updatedWishlist.id,
      wishlist: {
        ...updatedWishlist,
        items,
      },
    });
  },
);
