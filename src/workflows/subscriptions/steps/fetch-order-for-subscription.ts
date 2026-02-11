import { OrderDTO, OrderLineItemDTO } from '@medusajs/framework/types';
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk';

export type OrderWithItems = OrderDTO & {
  items: OrderLineItemDTO[];
  payment_collection_id: string;
};

/**
 * Fetches an order with its items for subscription processing
 */
export const fetchOrderForSubscriptionStep = createStep(
  'fetch-order-for-subscription',
  async ({ order_id }: { order_id: string }, { container }): Promise<StepResponse<{ order: OrderWithItems }>> => {
    const query = container.resolve('query');

    const { data: orders } = await query.graph({
      entity: 'order',
      fields: [
        'id',
        'currency_code',
        'customer_id',
        'payment_collection_id',
        'metadata',
        'items.*',
        'items.product_id',
        'items.variant_id',
      ],
      filters: { id: order_id },
    });

    const order = orders[0] as OrderWithItems;

    if (!order) {
      throw new Error(`Order ${order_id} not found`);
    }

    return new StepResponse({ order });
  },
);
