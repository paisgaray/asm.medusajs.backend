import { addToCartWorkflow } from '@medusajs/core-flows';
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { z } from 'zod';

export const PostStoreCartLineItemsBatchSchema = z.object({
  items: z
    .array(
      z.object({
        variant_id: z.string().min(1),
        quantity: z.number().int().positive(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .min(1),
});

type PostStoreCartLineItemsBatchBody = z.infer<typeof PostStoreCartLineItemsBatchSchema>;

const CART_FIELDS = [
  'id',
  'currency_code',
  'email',
  'region_id',
  'total',
  'subtotal',
  'tax_total',
  'discount_total',
  'shipping_total',
  'item_total',
  'items.id',
  'items.title',
  'items.variant_id',
  'items.quantity',
  'items.unit_price',
  'items.subtotal',
  'items.total',
  'items.tax_total',
  'items.discount_total',
  'items.thumbnail',
  'items.metadata',
  'items.variant.id',
  'items.variant.title',
  'items.variant.sku',
  'items.product.id',
  'items.product.title',
  'items.product.thumbnail',
];

async function fetchCart(cartId: string, scope: MedusaRequest['scope']) {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: 'cart',
    fields: CART_FIELDS,
    filters: { id: cartId },
  });
  return data?.[0] ?? null;
}

export async function POST(req: MedusaRequest<PostStoreCartLineItemsBatchBody>, res: MedusaResponse): Promise<void> {
  const cartId = req.params.id;

  const cart = await fetchCart(cartId, req.scope);
  if (!cart) {
    res.status(404).json({ message: 'Cart not found' });
    return;
  }

  const { items } = req.validatedBody;

  const results: Array<
    { variant_id: string; success: true; cart: unknown } | { variant_id: string; success: false; error: string }
  > = [];

  for (const item of items) {
    try {
      await addToCartWorkflow(req.scope).run({
        input: {
          cart_id: cartId,
          items: [
            {
              variant_id: item.variant_id,
              quantity: item.quantity,
              metadata: item.metadata,
            },
          ],
        },
      });

      const updatedCart = await fetchCart(cartId, req.scope);

      results.push({
        variant_id: item.variant_id,
        success: true,
        cart: updatedCart,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : String(error);

      results.push({
        variant_id: item.variant_id,
        success: false,
        error: message,
      });
    }
  }

  res.status(200).json({ results });
}
