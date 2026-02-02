import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';

console.log('[Order Preparing Subscriber] Subscriber carregado - SISTEMA NATIVO MedusaJS!');

export default async function handleOrderPreparing({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; order_id: string }>) {
  const fulfillmentId = data.id;
  const orderId = data.order_id;
  const timestamp = new Date().toISOString();

  console.log(`[Order Preparing Subscriber] ✅ Evento order.fulfillment_created capturado!`);
  console.log(`[Order Preparing Subscriber] Fulfillment ID: ${fulfillmentId}`);
  console.log(`[Order Preparing Subscriber] Order ID: ${orderId}`);
  console.log(`[Order Preparing Subscriber] Timestamp: ${timestamp}`);

  try {
    // 1. Buscar dados do pedido
    const orderModuleService = container.resolve(Modules.ORDER);

    console.log(`[Order Preparing Subscriber] Buscando order ${orderId}...`);
    const order = await orderModuleService.retrieveOrder(orderId);

    if (!order || !order.email) {
      console.error(`[Order Preparing Subscriber] ❌ Order ou email não encontrado`);
      return;
    }

    console.log(`[Order Preparing Subscriber] ✅ Dados encontrados:`);
    console.log(`[Order Preparing Subscriber] Order ID: ${order.display_id}`);
    console.log(`[Order Preparing Subscriber] Email: ${order.email}`);

    // 2. Enviar via Notification Module (Sistema Nativo)
    const notificationModuleService = container.resolve(Modules.NOTIFICATION);
    const notificationData = {
      to: order.email,
      channel: 'email',
      template: 'd-e0153efc5c184f878e833c2d42ca3247', // ORDER_PREPARING
      data: {
        order_id: order.display_id,
        customer_first_name: order.billing_address?.first_name || 'Cliente',
        order_total: (Number(order.total) / 100).toFixed(2),
        currency_code: order.currency_code?.toUpperCase() || 'EUR',
        preparing_date: new Date().toLocaleDateString('pt-PT'),
        store_url: process.env.STORE_URL || 'https://suggero.io',
      },
    };

    console.log(`[Order Preparing Subscriber] 📧 Enviando via Notification Module...`);
    await notificationModuleService.createNotifications(notificationData);

    console.log(`[Order Preparing Subscriber] ✅ E-mail de pedido em preparação enviado!`);
  } catch (error) {
    console.error(`[Order Preparing Subscriber] ❌ ERRO:`, error);
    if (error instanceof Error) {
      console.error(`[Order Preparing Subscriber] Mensagem:`, error.message);
      console.error(`[Order Preparing Subscriber] Stack:`, error.stack);
    }
  }
}

export const config: SubscriberConfig = {
  event: 'order.fulfillment_created', // ✅ EVENTO NATIVO DO MEDUSAJS
};
