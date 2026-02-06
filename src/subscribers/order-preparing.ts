import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderPreparingEmailWorkflow } from '../workflows/email/send-order-preparing-email';

export default async function handleOrderPreparing({
  event: { data },
  container,
}: SubscriberArgs<{ order_id: string }>) {
  const order_id = data.order_id;

  try {
    await sendOrderPreparingEmailWorkflow(container).run({ input: { order_id } });
  } catch (error) {
    console.error(`[Order Preparing] Erro ao enviar e-mail para order_id: ${order_id}`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'order.fulfillment_created',
};
