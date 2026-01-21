/**
 * Step: Get Fulfillment Order
 * Busca o fulfillment pelo ID e retorna o order_id associado
 *
 * Este step é usado pelo workflow de "Order Delivered" que recebe
 * fulfillment_id do evento nativo delivery.created
 *
 * Referência: https://docs.medusajs.com/resources/commerce-modules/fulfillment
 */

import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { Modules } from '@medusajs/framework/utils';

export interface GetFulfillmentOrderInput {
  fulfillment_id: string;
}

export interface GetFulfillmentOrderOutput {
  order_id: string;
}

export const getFulfillmentOrderStep = createStep(
  'get-fulfillment-order-step',
  async ({ fulfillment_id }: GetFulfillmentOrderInput, { container }) => {
    console.log(`[Get Fulfillment Order] Buscando fulfillment: ${fulfillment_id}`);

    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

    // Buscar fulfillment com relações
    const fulfillment = await fulfillmentModuleService.retrieveFulfillment(fulfillment_id, {
      relations: ['order'],
    });

    if (!fulfillment) {
      throw new Error(`Fulfillment ${fulfillment_id} não encontrado`);
    }

    console.log(`[Get Fulfillment Order] Fulfillment encontrado: ${fulfillment_id}`);

    // Obter order_id do fulfillment
    let orderId = fulfillment.order_id;

    // Fallback: tentar buscar da metadata
    if (!orderId && fulfillment.metadata?.order_id) {
      orderId = fulfillment.metadata.order_id as string;
    }

    // Fallback: tentar buscar das relações
    if (!orderId && fulfillment.order) {
      orderId = (fulfillment.order as any).id;
    }

    if (!orderId) {
      throw new Error(
        `Order ID não encontrado para fulfillment ${fulfillment_id}. ` +
          `Verifique se o fulfillment está associado a um pedido.`,
      );
    }

    console.log(`[Get Fulfillment Order] Order ID encontrado: ${orderId}`);

    return new StepResponse({
      order_id: orderId,
    });
  },
);
