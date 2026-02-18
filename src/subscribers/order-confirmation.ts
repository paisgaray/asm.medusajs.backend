import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderConfirmationEmailWorkflow } from '../workflows/email/send-order-confirmation-email';

export default async function handleOrderConfirmation({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const order_id = data.id;

  try {
    await sendOrderConfirmationEmailWorkflow(container).run({ input: { order_id } });
  } catch (error) {
    console.error(`[Order Confirmation] Erro ao enviar e-mail para order_id: ${order_id}`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed',
};
