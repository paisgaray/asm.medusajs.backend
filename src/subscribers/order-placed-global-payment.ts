import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import axios from 'axios';
import crypto from 'node:crypto';

/**
 * Subscriber that triggers subscription creation when an order is placed
 */
export default async function orderPlacedGlobalPayment({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve('logger');
  const query = container.resolve('query');

  const orderId = data.id;

  logger.info(`Order placed event received for order: ${orderId}`);

  try {
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: ['id', 'payment_collections.payment_sessions.provider_id', 'payment_collections.payment_sessions.data'],
      filters: { id: orderId },
    });

    const orderPaymentSession = orders[0]?.payment_collections[0]?.payment_sessions[0];
    const orderProviderId = orderPaymentSession?.provider_id;
    const orderData = orderPaymentSession?.data;

    if (orderProviderId === 'pp_global-payments_global-payments') {
      const nonce = new Date().toISOString();
      const secret = crypto.createHash('sha512').update(`${nonce}${process.env.GLOBAL_PAYMENTS_APP_KEY}`).digest('hex');

      const { data } = await axios.post<{ type: string; token: string }>(
        'https://apis.sandbox.globalpay.com/ucp/accesstoken',
        {
          grant_type: 'client_credentials',
          app_id: process.env.GLOBAL_PAYMENTS_APP_ID,
          secret,
          nonce,
        },
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-GP-Version': '2021-03-22' } },
      );

      await axios.patch(
        `https://apis.sandbox.globalpay.com/ucp/payment-methods/${orderData.token}`,
        { usage_mode: 'MULTIPLE' },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `${data.type} ${data.token}`,
            Accept: 'application/json',
            'X-GP-Version': '2021-03-22',
          },
        },
      );
    }
  } catch (error) {
    logger.error(
      `Failed to process chage token globalpayment from single-use to multi-use for order ${orderId}:`,
      error,
    );
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed',
};
