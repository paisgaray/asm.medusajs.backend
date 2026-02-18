import { OrderWorkflowDTO } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export interface GetOrderByIdInput {
  order_id: string;
}

export interface GetOrderByIdOutput {
  order: OrderWorkflowDTO;
  payment: {
    card: {
      brand?: string;
      last4?: string;
    };
  };
}

export const getOrderByIdStep = createStep(
  'get-order-by-id-step',
  async ({ order_id }: GetOrderByIdInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

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
      filters: { id: order_id },
    });

    if (!order) throw new Error(`Order ${order_id} não encontrada`);

    const payment = order?.payment_collections?.[0]?.payments?.[0]?.data;

    return new StepResponse({ order, payment });
  },
);
