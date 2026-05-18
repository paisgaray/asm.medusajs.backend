import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { ensureDefaultWishlistWorkflow } from '../workflows/wishlist/ensure-default-wishlist';

export default async function customerCreatedHandler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve('logger');
  const customerId = data.id;

  logger.info(`Customer created event received for customer: ${customerId}`);

  try {
    await ensureDefaultWishlistWorkflow(container).run({
      input: { customer_id: customerId },
    });

    logger.info(`Default wishlist ensured for customer: ${customerId}`);
  } catch (error) {
    logger.error(`Failed to create default wishlist for customer ${customerId}:`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'customer.created',
};
