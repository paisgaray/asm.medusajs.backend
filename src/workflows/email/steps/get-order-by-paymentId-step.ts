import { OrderWorkflowDTO } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export interface GetOrderByPaymentIdInput {
  payment_id: string;
}

export interface GetOrderByPaymentIdOutput {
  order: OrderWorkflowDTO;
  payment: {
    card: {
      brand?: string;
      last4?: string;
    };
  };
}

export const getOrderByPaymentIdStep = createStep(
  'get-order-by-payment-id-step',
  async ({ payment_id }: GetOrderByPaymentIdInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [payment],
    } = await query.graph({
      entity: 'payment',
      fields: ['id', 'data', 'payment_collection.id'],
      filters: { id: payment_id },
    });

    const {
      data: [paymentCollection],
    } = await query.graph({
      entity: 'payment_collection',
      fields: ['id', 'order.id'],
      filters: {
        id: payment.payment_collection.id,
      },
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
      filters: { id: paymentCollection.order.id },
    });

    if (!order) throw new Error(`Order ${paymentCollection.order.id} não encontrada`);

    return new StepResponse({ order, payment: payment.data });
  },
);
