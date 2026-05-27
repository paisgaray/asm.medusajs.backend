import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { SubscriptionProvider } from '../modules/subscriptions';
import { createPaymentMethodWorkflow } from '../workflows/payment';

/**
 * Subscriber that triggers payment method persistence when an order is placed
 */
export default async function orderPlacedGlobalPayment({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve('logger');
  const query = container.resolve('query');

  const orderId = data.id;

  logger.info(`Order placed event received for order: ${orderId}`);

  try {
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: [
        'id',
        'customer_id',
        'payment_collections.payment_sessions.provider_id',
        'payment_collections.payment_sessions.data',
      ],
      filters: { id: orderId },
    });

    const orderPaymentSession = orders[0]?.payment_collections[0]?.payment_sessions[0];
    const orderProviderId = orderPaymentSession?.provider_id;
    const orderData = orderPaymentSession?.data;
    const customerId = orders[0]?.customer_id;

    if (orderProviderId === SubscriptionProvider.GLOBAL_PAYMENTS) {
      const paymentToken = (orderData?.payment_token ?? orderData?.token) as string | undefined;

      if (!paymentToken) {
        logger.warn(`No payment token found for Global Payments order ${orderId}`);
        return;
      }

      // Persist on the customer account holder so checkout behavior matches Stripe.
      if (!customerId) {
        logger.warn(`Order ${orderId} has no customer_id, skipping Global Payments payment method persistence`);
        return;
      }

      const { data: customers } = await query.graph(
        {
          entity: 'customer',
          fields: ['id', 'account_holders.provider_id', 'account_holders.data'],
          filters: { id: customerId },
        },
        { throwIfKeyNotFound: false },
      );

      const accountHolders =
        (
          customers?.[0] as {
            account_holders?: Array<{ provider_id?: string; data?: Record<string, unknown> }>;
          }
        )?.account_holders ?? [];

      const globalAccountHolder = accountHolders.find(
        (holder) => holder.provider_id === SubscriptionProvider.GLOBAL_PAYMENTS,
      );

      const existingMethods =
        (globalAccountHolder?.data?.payment_methods as Array<{ id?: string; token?: string }> | undefined) ?? [];

      const alreadySaved = existingMethods.some(
        (method) => method.id === paymentToken || method.token === paymentToken,
      );

      if (!alreadySaved) {
        const { errors } = await createPaymentMethodWorkflow(container).run({
          input: {
            customer_id: customerId,
            provider_id: SubscriptionProvider.GLOBAL_PAYMENTS,
            payment_method_id: paymentToken,
          },
        });

        if (errors?.length) {
          const errorMessages = errors.map((e) => (e instanceof Error ? e.message : String(e))).join('; ');
          throw new Error(`Failed to persist Global Payments method for order ${orderId}: ${errorMessages}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Failed to persist Global Payments payment method for order ${orderId}:`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed',
};
