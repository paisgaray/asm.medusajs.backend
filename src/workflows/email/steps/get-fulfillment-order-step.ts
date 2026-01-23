/**
 * Step: Get Fulfillment Order
 * Busca o fulfillment pelo ID e retorna o order_id associado
 *
 * Este step é usado pelo workflow de "Order Delivered" que recebe
 * fulfillment_id do evento nativo delivery.created
 *
 * Referência: https://docs.medusajs.com/resources/commerce-modules/fulfillment
 */

import { Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export interface GetFulfillmentOrderInput {
  fulfillment_id: string;
}

export interface GetFulfillmentOrderOutput {
  order_id: string;
}

export const getFulfillmentOrderStep = createStep(
  'get-fulfillment-order-step',
  async ({ fulfillment_id }: GetFulfillmentOrderInput, { container }) => {
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
    const orderModuleService = container.resolve(Modules.ORDER);

    const fulfillment = await fulfillmentModuleService.retrieveFulfillment(fulfillment_id);

    if (!fulfillment) {
      throw new Error(`Fulfillment ${fulfillment_id} não encontrado`);
    }

    let orderId: string | undefined;

    if (fulfillment.metadata?.order_id) {
      orderId = fulfillment.metadata.order_id as string;
    }

    if (!orderId) {
      const orders = await orderModuleService.listOrders({});

      for (const order of orders) {
        const orderWithFulfillments = await orderModuleService.retrieveOrder(order.id, {
          relations: ['fulfillments'],
        });

        const hasFulfillment = (orderWithFulfillments as { fulfillments?: { id: string }[] }).fulfillments?.some(
          (f) => f.id === fulfillment_id,
        );

        if (hasFulfillment) {
          orderId = order.id;
          break;
        }
      }
    }

    if (!orderId) {
      throw new Error(
        `Order ID não encontrado para fulfillment ${fulfillment_id}. ` +
          `Verifique se o fulfillment está associado a um pedido.`,
      );
    }

    return new StepResponse({
      order_id: orderId,
    });
  },
);
