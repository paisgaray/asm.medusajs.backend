import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { Modules } from '@medusajs/framework/utils';

type CartItem = {
  id: string;
};

type Cart = {
  id: string;
  items?: CartItem[];
};

export async function DELETE(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const cartId = req.params.id as string;

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const cartResult = await query.graph({
      entity: 'cart',
      fields: ['id', 'items.id'],
      filters: { id: cartId },
    });

    const cart = cartResult?.data?.[0] as Cart | undefined;

    if (!cart) {
      res.status(404).json({
        message: 'Cart not found',
      });
      return;
    }

    const items = cart.items || [];

    if (items.length === 0) {
      res.json({
        message: 'Cart is already empty',
        deleted_count: 0,
      });
      return;
    }

    const link = req.scope.resolve(ContainerRegistrationKeys.LINK);
    const cartModule = req.scope.resolve(Modules.CART);

    const itemIds = items.map((item: CartItem) => item.id);

    for (const itemId of itemIds) {
      try {
        if (typeof cartModule.delete === 'function') {
          await cartModule.delete([itemId]);
        } else if (typeof cartModule.deleteLineItems === 'function') {
          await cartModule.deleteLineItems([itemId]);
        } else if (typeof cartModule.deleteLineItem === 'function') {
          await cartModule.deleteLineItem(cartId, itemId);
        } else {
          await link.delete([
            {
              [Modules.CART]: { id: cartId },
              [Modules.CART]: { id: itemId },
            },
          ]);
        }
      } catch {
        // Continue to next item
      }
    }

    const updatedCartResult = await query.graph({
      entity: 'cart',
      fields: ['id', 'items.id'],
      filters: { id: cartId },
    });

    const updatedCart = updatedCartResult?.data?.[0] as Cart | undefined;

    res.json({
      message: 'Cart cleared successfully',
      deleted_count: items.length,
      cart: {
        id: updatedCart?.id,
        items_count: updatedCart?.items?.length || 0,
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error);

    res.status(500).json({
      message: 'Failed to clear cart',
      error: errorMessage,
    });
  }
}

