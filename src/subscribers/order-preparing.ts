import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderPreparingEmailWorkflow } from '../workflows/email/send-order-preparing-email';

export default async function handleOrderPreparing({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; order_id: string }>) {
  // order.fulfillment_created retorna { id: fulfillment_id, order_id: order_id }
  const orderId = data.order_id || data.id;

  console.log(`[Order Preparing] Iniciando envio de e-mail para order_id: ${orderId}`);

  try {
    // Executar workflow de envio de e-mail
    await sendOrderPreparingEmailWorkflow(container).run({
      input: {
        order_id: orderId,
      },
    });

    console.log(`[Order Preparing] E-mail enviado com sucesso para order_id: ${orderId}`);
  } catch (error) {
    // Log do erro mas não falha o subscriber
    // Isso evita que o evento seja reprocessado indefinidamente
    console.error(`[Order Preparing] Erro ao enviar e-mail para order_id: ${orderId}`, error);
  }
}

export const config: SubscriberConfig = {
  event: 'order.fulfillment_created', // ✅ EVENTO NATIVO DO MEDUSAJS
};
