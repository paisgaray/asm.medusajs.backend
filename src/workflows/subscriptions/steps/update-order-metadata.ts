import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

/**
 * Updates order metadata with subscription references
 */
export const updateOrderMetadataStep = createStep(
  'update-order-metadata',
  async (
    {
      order_id,
      subscription_ids,
    }: {
      order_id: string;
      subscription_ids: string[];
    },
    { container },
  ) => {
    const logger = container.resolve('logger');
    const orderModule = container.resolve('order');

    logger.info(`Updating order ${order_id} with ${subscription_ids.length} subscription references`);

    // Get current order to preserve existing metadata
    const query = container.resolve('query');
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: ['id', 'metadata'],
      filters: { id: order_id },
    });

    const order = orders[0];

    await orderModule.updateOrders(order_id, {
      metadata: {
        ...order.metadata,
        subscription_ids,
        is_subscription_order: true,
      },
    });

    logger.info(`Order ${order_id} updated with subscription metadata`);

    return new StepResponse({
      success: true,
    });
  },
);
