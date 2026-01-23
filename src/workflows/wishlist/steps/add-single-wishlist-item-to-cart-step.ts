import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';
import { addWishlistItemToCartWorkflow } from '../../wishlist/add-wishlist-item-to-cart';

type WishlistVariantItem = {
  id: string;
  wishlist_id: string;
  product_id: string;
  product_variant_id: string;
  quantity: number;
};

type AddSingleWishlistItemToCartStepResult = {
  status: number;
  body: {
    message: string;
    cart?: unknown;
    variant_used?: string;
    original_variant_id?: string;
    fallback_used?: boolean;
    error?: string;
    variant_id?: string;
    product_id?: string | null;
    cart_id?: string;
    suggestion?: string;
  };
};

function isVariantError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('do not exist') ||
      error.message.includes('not published') ||
      error.message.includes('has no valid variants') ||
      error.message.includes('is not published')
    );
  }

  return false;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.message === 'string') {
        return parsed.message;
      }
    } catch {}
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

type AddSingleWishlistItemToCartStepInput = {
  item: WishlistVariantItem;
  cart_id: string;
};

export const addSingleWishlistItemToCartStep = createStep(
  'add-single-wishlist-item-to-cart-step',
  async (input: AddSingleWishlistItemToCartStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);

    try {
      const workflow = addWishlistItemToCartWorkflow(container);
      const { result } = await workflow.run({
        input: {
          cart_id: input.cart_id,
          wishlist_id: input.item.wishlist_id,
          item_id: input.item.id,
          product_id: input.item.product_id,
          variant_id: input.item.product_variant_id,
          quantity: input.item.quantity,
        },
      });

      const validatedVariant = result.variant_validation;
      const response: AddSingleWishlistItemToCartStepResult = {
        status: 200,
        body: {
          cart: result.cart,
          message: 'Item added to cart successfully and removed from wishlist',
        },
      };

      if (validatedVariant?.fallback) {
        response.body.variant_used = validatedVariant.variant_id;
        response.body.original_variant_id = input.item.product_variant_id;
        response.body.fallback_used = true;
        response.body.message =
          'Item added to cart successfully (variant was updated to a valid one) and removed from wishlist';
      }

      // Remove item da wishlist após adicionar ao carrinho
      try {
        await wishlistService.deleteWishlistItems(input.item.id);
      } catch (deleteError) {
        const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
          error?: (message: string) => void;
        };
        const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
        logger?.error?.(
          `Failed to remove wishlist item ${input.item.id} after adding to cart ${input.cart_id}: ${errorMessage}`,
        );
        // Atualiza a resposta para indicar que houve problema ao remover da wishlist
        response.body.message = `Item added to cart but failed to remove from wishlist: ${errorMessage}`;
        response.body.error = `Failed to remove from wishlist: ${errorMessage}`;
      }

      return new StepResponse<AddSingleWishlistItemToCartStepResult>(response);
    } catch (error: unknown) {
      const errorMessage = extractErrorMessage(error);
      const variantError = isVariantError(error);

      const failure: AddSingleWishlistItemToCartStepResult = {
        status: variantError ? 400 : 500,
        body: {
          message: 'Failed to add item to cart',
          error: variantError
            ? `Variante não existe ou o produto não está publicado: ${input.item.product_variant_id}. Detalhes: ${errorMessage}`
            : errorMessage,
          variant_id: input.item.product_variant_id,
          product_id: input.item.product_id,
          cart_id: input.cart_id,
        },
      };

      if (errorMessage.includes('has no variants') || errorMessage.includes('does not exist')) {
        failure.body.suggestion =
          'The variant or product IDs in the wishlist may be incorrect. Please verify the product and variant IDs or remove the item from the wishlist and add it again.';
      }

      return new StepResponse<AddSingleWishlistItemToCartStepResult>(failure);
    }
  },
);
