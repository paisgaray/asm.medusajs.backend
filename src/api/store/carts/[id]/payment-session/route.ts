import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const cartId = req.params.id;

  const query = req.scope.resolve('query');

  try {
    // Query the cart with payment collection link
    const { data: carts } = await query.graph({
      entity: 'cart',
      fields: ['id', 'email', 'payment_collection.*', 'payment_collection.payment_sessions.*'],
      filters: {
        id: cartId,
      },
    });

    if (!carts || carts.length === 0) {
      res.status(404).json({
        message: 'Cart not found',
      });
      return;
    }

    const cart = carts[0];
    const paymentSession = cart.payment_collection?.payment_sessions?.[0];

    res.json({
      payment_session: paymentSession || null,
      email: cart.email || null,
    });
  } catch (error) {
    console.error('Error fetching payment session:', error);
    res.status(500).json({
      message: 'Failed to fetch payment session',
      error: error.message,
    });
  }
};
