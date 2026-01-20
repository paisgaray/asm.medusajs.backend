/**
 * Step: Get Order By ID
 * Busca os dados completos do pedido pelo order_id
 */

import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import type { MedusaOrder } from '../../../types/medusa-data';

export interface GetOrderByIdInput {
  order_id: string;
}

export interface GetOrderByIdOutput {
  order: MedusaOrder;
}

export const getOrderByIdStep = createStep(
  'get-order-by-id-step',
  async ({ order_id }: GetOrderByIdInput, { container }) => {
    const query = container.resolve('query');

    // Buscar a order com todos os relacionamentos necessários
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: [
        '*',
        'items.*',
        'items.variant.*',
        'items.variant.product.*',
        'items.variant.product.thumbnail',
        'shipping_address.*',
        'billing_address.*',
        'shipping_methods.*',
        'payment_collection.*',
        'payment_collection.payments.*',
        'customer.*',
      ],
      filters: {
        id: order_id,
      },
    });

    if (!orders || orders.length === 0) {
      throw new Error(`Order ${order_id} não encontrada`);
    }

    const order = orders[0] as unknown as MedusaOrder;

    if (!order) {
      throw new Error(`Order ${order_id} não encontrada`);
    }

    // Buscar o primeiro pagamento (se existir) para pegar dados do método de pagamento
    const payment = order.payment_collection?.payments?.[0];

    return new StepResponse({ order, payment });
  },
);
