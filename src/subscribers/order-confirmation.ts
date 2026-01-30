import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

import { sendOrderConfirmationEmailWorkflow } from '../workflows/email/send-order-confirmation-email';

console.log('[Order Confirmation Subscriber] Subscriber carregado e registrado para evento: order.placed');

export default async function handleOrderConfirmation({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const orderId = data.id;
  const timestamp = new Date().toISOString();

  console.log(`[Order Confirmation Subscriber] ✅ Evento order.placed capturado!`);
  console.log(`[Order Confirmation Subscriber] Order ID: ${orderId}`);
  console.log(`[Order Confirmation Subscriber] Timestamp: ${timestamp}`);
  console.log(`[Order Confirmation Subscriber] Event data:`, JSON.stringify(data, null, 2));

  try {
    console.log(`[Order Confirmation Subscriber] Iniciando workflow de envio de email...`);

    const result = await sendOrderConfirmationEmailWorkflow(container).run({
      input: {
        order_id: orderId,
      },
    });

    console.log(`[Order Confirmation Subscriber] ✅ Workflow executado com sucesso!`);
    console.log(`[Order Confirmation Subscriber] Result:`, JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`[Order Confirmation Subscriber] ❌ ERRO ao enviar e-mail para order_id: ${orderId}`, error);
    if (error instanceof Error) {
      console.error(`[Order Confirmation Subscriber] Mensagem:`, error.message);
      console.error(`[Order Confirmation Subscriber] Stack:`, error.stack);
    }
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed', // ✅ EVENTO NATIVO DO MEDUSAJS
};
