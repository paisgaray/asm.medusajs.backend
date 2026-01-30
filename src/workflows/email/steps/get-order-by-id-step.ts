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
    console.log(`[GetOrderById Step] Buscando pedido com ID: ${order_id}`);

    try {
      const { Modules } = await import('@medusajs/framework/utils');
      const orderModule = container.resolve(Modules.ORDER);

      console.log(`[GetOrderById Step] Order Module resolvido, buscando pedido...`);
      const order = (await orderModule.retrieveOrder(order_id)) as unknown as MedusaOrder;

      if (!order) {
        console.error(`[GetOrderById Step] ❌ Pedido ${order_id} não encontrado!`);
        throw new Error(`Order ${order_id} não encontrada`);
      }

      console.log(`[GetOrderById Step] ✅ Pedido encontrado!`);
      console.log(`[GetOrderById Step] Order ID: ${order.id}`);
      console.log(`[GetOrderById Step] Order Display ID: ${order.display_id}`);
      console.log(`[GetOrderById Step] Order Email: ${order.email}`);
      console.log(`[GetOrderById Step] Order Total: ${order.total}`);
      console.log(`[GetOrderById Step] Order Currency: ${order.currency_code}`);

      const payment = undefined;

      return new StepResponse({ order, payment });
    } catch (error) {
      console.error(`[GetOrderById Step] ❌ ERRO ao buscar pedido:`, error);
      if (error instanceof Error) {
        console.error(`[GetOrderById Step] Mensagem:`, error.message);
        console.error(`[GetOrderById Step] Stack:`, error.stack);
      }
      throw error;
    }
  },
);
