/**
 * Step: Get Order Data
 * Busca os dados do pedido a partir do payment_id
 * VERSÃO SIMPLIFICADA: Retorna o que conseguir buscar
 */

import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import type { MedusaOrder, MedusaPayment } from '../../../types/medusa-data';

export interface GetOrderDataInput {
  payment_id: string;
  order_id?: string; // Opcional: se já tiver o order_id
}

export interface GetOrderDataOutput {
  order: MedusaOrder;
  payment: MedusaPayment | null;
}

export const getOrderDataStep = createStep(
  'get-order-data-step',
  async ({ payment_id, order_id }: GetOrderDataInput, { container }) => {
    const paymentModule = container.resolve(Modules.PAYMENT);
    const orderModule = container.resolve(Modules.ORDER);

    let payment: MedusaPayment | null = null;
    try {
      payment = (await paymentModule.retrievePayment(payment_id)) as unknown as MedusaPayment;
    } catch (error) {
      payment = null;
    }

    let order: MedusaOrder | null = null;

    if (order_id) {
      try {
        order = (await orderModule.retrieveOrder(order_id)) as unknown as MedusaOrder;
      } catch (error) {
        order = null;
      }
    }

    if (!order) {
      const recentOrders = await orderModule.listOrders(
        {},
        {
          take: 1,
          order: { created_at: 'DESC' },
        },
      );

      if (recentOrders && recentOrders.length > 0) {
        order = recentOrders[0] as unknown as MedusaOrder;
      }
    }

    if (!order) {
      throw new Error('Não foi possível encontrar nenhuma order');
    }

    return new StepResponse({ order, payment });
  },
);
