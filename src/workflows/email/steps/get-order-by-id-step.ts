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
  payment?: null; // Sempre null neste step (para compatibilidade)
}

export const getOrderByIdStep = createStep(
  'get-order-by-id-step',
  async ({ order_id }: GetOrderByIdInput, { container }) => {
    const { Modules } = await import('@medusajs/framework/utils');
    const orderModule = container.resolve(Modules.ORDER);

    const order = (await orderModule.retrieveOrder(order_id)) as unknown as MedusaOrder;

    if (!order) {
      throw new Error(`Order ${order_id} não encontrada`);
    }

    const payment = undefined;

    return new StepResponse({ order, payment });
  },
);
