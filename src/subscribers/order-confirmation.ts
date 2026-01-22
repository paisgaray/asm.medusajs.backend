import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderConfirmationEmailWorkflow } from '../workflows/email/send-order-confirmation-email';

export default async function handleOrderConfirmation({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const orderId = data.id;

  try {
    await sendOrderConfirmationEmailWorkflow(container).run({
      input: {
        order_id: orderId,
      },
    });
  } catch (error) {
    console.error(`[Order Confirmation] Erro ao enviar e-mail para order_id: ${orderId}`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed', // ✅ EVENTO NATIVO DO MEDUSAJS
};
