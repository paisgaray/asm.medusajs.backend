import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { createSubscriptionWorkflow } from '../workflows/subscriptions';

export default async function handleSubscriptionCreation({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = data.id;
  const logger = container.resolve('logger');

  try {
    // Query to get order with items and products
    const query = container.resolve('query');
    const {
      data: [order],
    } = await query.graph({
      entity: 'order',
      filters: { id: orderId },
      fields: [
        'id',
        'customer_id',
        'items.*',
        'items.product.*',
        'items.product.tags.*',
        'items.variant.*',
        'items.product.metadata',
      ],
    });

    if (!order || !order.items || order.items.length === 0) {
      logger.info(`[Subscription Creation] Order ${orderId} has no items`);
      return;
    }

    // Separate subscription items from one-time items
    const subscriptionItems: any[] = [];
    const oneTimeItems: any[] = [];

    for (const item of order.items) {
      const isSubscription = item.product?.tags?.some((tag: any) => tag.value === 'subscription');
      const hasSubscriptionPrice = item.product?.metadata?.subscription_price;

      if (isSubscription && hasSubscriptionPrice) {
        subscriptionItems.push(item);
      } else {
        oneTimeItems.push(item);
      }
    }

    if (subscriptionItems.length === 0) {
      logger.info(`[Subscription Creation] Order ${orderId} has no subscription items`);
      return;
    }

    logger.info(`[Subscription Creation] Found ${subscriptionItems.length} subscription items in order ${orderId}`);

    // Create subscription for each subscription item (bundle)
    for (const subscriptionItem of subscriptionItems) {
      const bundleProductId = subscriptionItem.product.id;

      try {
        // Prepare one-time items for the first invoice (only for the first subscription)
        const oneTimeItemsData = [];
        //   subscriptionItems.indexOf(subscriptionItem) === 0
        //     ? oneTimeItems.map((item: any) => ({
        //       price_data: {
        //         currency: order.currency_code || 'eur',
        //         product: item.product.id,
        //         unit_amount: Math.round((item.unit_price || 0) * 100), // Convert to cents
        //       },
        //       quantity: item.quantity,
        //     }))
        //     : [];

        logger.info(`[Subscription Creation] Creating subscription for bundle ${bundleProductId}`);

        const { result } = await createSubscriptionWorkflow(container).run({
          input: {
            customer_id: order.customer_id,
            bundle_product_id: bundleProductId,
            // one_time_items: oneTimeItemsData.length > 0 ? oneTimeItemsData : undefined,
          },
        });

        logger.info(
          `[Subscription Creation] Successfully created subscription ${result.subscription.id} for order ${orderId}`,
        );

        // TODO: Link subscription to order using links module
        // This would be done via a link service when implemented
      } catch (error: any) {
        logger.error(
          `[Subscription Creation] Failed to create subscription for bundle ${bundleProductId} in order ${orderId}:`,
          error.message,
        );
        // Don't throw - we don't want to fail the order if subscription creation fails
        // The error is logged for manual intervention as per requirements
      }
    }
  } catch (error: any) {
    logger.error(`[Subscription Creation] Error processing order ${orderId}:`, error.message);
    // Don't throw - we don't want to fail the order
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed',
};
