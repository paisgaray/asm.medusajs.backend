import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderDeliveredEmailWorkflow } from '../workflows/email/send-order-delivered-email';

export default async function handleOrderDelivered({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const fulfillment_id = data.id;

  try {
    await sendOrderDeliveredEmailWorkflow(container).run({ input: { fulfillment_id } });
  } catch (error) {
    console.error(`[Order Delivered] Erro ao enviar e-mail para fulfillment_id: ${fulfillment_id}`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'delivery.created',
};
