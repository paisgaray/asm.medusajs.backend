import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

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

    const cartModule = req.scope.resolve(Modules.CART);

    const itemIds = items.map((item: CartItem) => item.id);

    try {
      await cartModule.deleteLineItems(itemIds);
    } catch {
      // Continue even if deletion fails
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
