import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';
import { addBundleToCartWorkflow } from '../../bundled-product/workflows/add-bundle-to-cart';

type BundleItemSelection = {
  item_id: string;
  variant_id: string;
};

type MoveBundleToCartStepInput = {
  wishlist_item_id: string;
  wishlist_id: string;
  bundle_id: string;
  cart_id: string;
  quantity: number;
  items: BundleItemSelection[];
};

type MoveBundleToCartStepOutput = {
  cart: unknown;
  message: string;
};

export const moveBundleToCartStep = createStep(
  'move-bundle-to-cart-step',
  async (input: MoveBundleToCartStepInput, { container }) => {
    const wishlistService: WishlistService = container.resolve(WISHLIST_MODULE);
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
      info?: (message: string) => void;
      warn?: (message: string) => void;
      error?: (message: string) => void;
    };

    let cart: unknown;

    try {
      const { result } = await addBundleToCartWorkflow(container).run({
        input: {
          cart_id: input.cart_id,
          bundle_id: input.bundle_id,
          quantity: input.quantity,
          items: input.items,
        },
      });
      cart = result;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : typeof error === 'string' ? error : 'Failed to add bundle to cart';

      logger?.error?.(
        `Failed to add bundle ${input.bundle_id} from wishlist ${input.wishlist_id} to cart ${input.cart_id}: ${message}`,
      );

      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Failed to add bundle to cart: ${message}`);
    }

    try {
      await wishlistService.deleteWishlistItems(input.wishlist_item_id);
    } catch (deleteError) {
      logger?.error?.(
        `Failed to remove wishlist item ${input.wishlist_item_id} after adding bundle ${input.bundle_id} to cart ${input.cart_id}: ${
          deleteError instanceof Error ? deleteError.message : deleteError
        }`,
      );
    }

    logger?.info?.(
      `Bundle ${input.bundle_id} moved from wishlist ${input.wishlist_id} to cart ${input.cart_id} (wishlist item ${input.wishlist_item_id}).`,
    );

    const output: MoveBundleToCartStepOutput = {
      cart,
      message: 'Bundle added to cart successfully and removed from wishlist',
    };

    return new StepResponse(output);
  },
);
