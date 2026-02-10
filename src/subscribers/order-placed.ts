import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { checkoutSubscriptionWorkflow } from '../workflows/subscriptions/checkout-subscription';

/**
 * Subscriber that triggers subscription creation when an order is placed
 */
export default async function orderPlacedHandler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve('logger');
  const query = container.resolve('query');

  const orderId = data.id;

  logger.info(`Order placed event received for order: ${orderId}`);

  try {
    // Fetch order to get customer ID
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: ['id', 'customer_id'],
      filters: { id: orderId },
    });

    const order = orders[0];

    if (!order?.customer_id) {
      logger.warn(`Order ${orderId} has no customer_id, skipping subscription check`);
      return;
    }

    // Run checkout subscription workflow
    const { result } = await checkoutSubscriptionWorkflow(container).run({
      input: {
        order_id: orderId,
        customer_id: order.customer_id,
      },
    });

    if (result.has_subscriptions) {
      logger.info(`Created ${result.subscription_ids.length} subscription(s) for order ${orderId}`);
    } else {
      logger.info(`No subscription items found in order ${orderId}`);
    }
  } catch (error) {
    logger.error(`Failed to process subscriptions for order ${orderId}:`, error);
    // Don't throw - we don't want to fail the order if subscription creation fails
    // The order can be manually processed later
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed',
};
