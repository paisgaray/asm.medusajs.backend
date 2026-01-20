/**
 * Step: Get Order Data
 * Busca os dados completos do pedido com todos os relacionamentos necessários
 */

import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import type { MedusaOrder, MedusaPayment } from '../../../types/medusa-data';

export interface GetOrderDataInput {
  payment_id: string;
}

export interface GetOrderDataOutput {
  order: MedusaOrder;
  payment: MedusaPayment;
}

export const getOrderDataStep = createStep(
  'get-order-data-step',
  async ({ payment_id }: GetOrderDataInput, { container }) => {
    const paymentModule = container.resolve(Modules.PAYMENT);
    const query = container.resolve('query');

    // 1. Buscar informações do pagamento com payment_collection
    const payment = (await paymentModule.retrievePayment(payment_id, {
      relations: ['payment_collection'],
    })) as unknown as MedusaPayment;

    const paymentCollectionId = payment.payment_collection_id;

    if (!paymentCollectionId) {
      throw new Error(`Payment ${payment_id} não possui payment_collection_id associado`);
    }

    // 2. Buscar a order através da payment_collection
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
        payment_collections: {
          id: paymentCollectionId,
        },
      },
    });

    if (!orders || orders.length === 0) {
      throw new Error(`Order não encontrada para payment_collection ${paymentCollectionId}`);
    }

    // 3. Buscar pedido completo (mantendo código original depois do filtro)
    const orderId = orders[0].id;
    const { data: fullOrders } = await query.graph({
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
        id: orderId,
      },
    });

    const order = orders?.[0] as unknown as MedusaOrder;

    if (!order) {
      throw new Error(`Order ${orderId} não encontrado`);
    }

    return new StepResponse({ order, payment });
  },
);
