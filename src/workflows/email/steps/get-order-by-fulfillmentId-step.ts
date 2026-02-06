import { OrderWorkflowDTO } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export interface GetOrderByFulfillmentIdInput {
  fulfillment_id: string;
}

export interface GetOrderByFulfillmentIdOutput {
  order: OrderWorkflowDTO;
  payment: {
    card: {
      brand?: string;
      last4?: string;
    };
  };
}

export const getOrderByFulfillmentIdStep = createStep(
  'get-order-by-fulfillment-id-step',
  async ({ fulfillment_id }: GetOrderByFulfillmentIdInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [fulfillment],
    } = await query.graph({
      entity: 'fulfillment',
      fields: ['id', 'order.id', 'labels.*'],
      filters: { id: fulfillment_id },
    });

    const {
      data: [order],
    } = await query.graph({
      entity: 'order',
      fields: [
        'id',
        'display_id',
        'email',
        'currency_code',
        'total',
        'items.*',
        'items.product.*',
        'items.variant.*',
        'items.tax_lines.*',
        'shipping_address.*',
        'billing_address.*',
        'shipping_methods.*',
        'payment_collections.*',
        'payment_collections.payments.*',
        'customer.*',
        'total',
        'subtotal',
        'discount_total',
        'shipping_total',
        'tax_total',
        'item_subtotal',
        'item_total',
        'item_tax_total',
      ],
      filters: { id: fulfillment.order.id },
    });

    if (!order) throw new Error(`Order ${fulfillment.order.id} não encontrada`);

    const {
      data: [payment],
    } = await query.graph({
      entity: 'payment',
      fields: ['id', 'data', 'payment_collection.id'],
      filters: { id: order.payment_collections?.[0]?.payments?.[0]?.id },
    });

    return new StepResponse({ order, payment: payment.data });
  },
);
