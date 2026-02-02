import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';

console.log('[Order Delivered Subscriber] Subscriber carregado - SISTEMA NATIVO MedusaJS!');

export default async function handleOrderDelivered({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; order_id?: string }>) {
  const deliveryId = data.id;
  const orderId = data.order_id;
  const timestamp = new Date().toISOString();

  console.log(`[Order Delivered Subscriber] ✅ Evento delivery.created capturado!`);
  console.log(`[Order Delivered Subscriber] Delivery ID: ${deliveryId}`);
  console.log(`[Order Delivered Subscriber] Order ID: ${orderId}`);
  console.log(`[Order Delivered Subscriber] Timestamp: ${timestamp}`);

  try {
    // 1. Buscar dados do pedido
    const orderModuleService = container.resolve(Modules.ORDER);
    let order;
    if (orderId) {
      console.log(`[Order Delivered Subscriber] Buscando order ${orderId}...`);
      order = await orderModuleService.retrieveOrder(orderId);
    } else {
      console.log(`[Order Delivered Subscriber] ❌ Order ID não fornecido no evento`);
      return;
    }
    if (!order || !order.email) {
      console.error(`[Order Delivered Subscriber] ❌ Order ou email não encontrado`);
      return;
    }

    console.log(`[Order Delivered Subscriber] ✅ Dados encontrados:`);
    console.log(`[Order Delivered Subscriber] Order ID: ${order.display_id}`);
    console.log(`[Order Delivered Subscriber] Email: ${order.email}`);

    // 2. Enviar via Notification Module (Sistema Nativo)
    const notificationModuleService = container.resolve(Modules.NOTIFICATION);
    const notificationData = {
      to: order.email,
      channel: 'email',
      template: 'd-c0157e4c7a4a4ebe839fae834b9d6168', // ORDER_DELIVERED
      data: {
        order_id: order.display_id,
        customer_first_name: order.billing_address?.first_name || 'Cliente',
        order_total: (Number(order.total) / 100).toFixed(2),
        currency_code: order.currency_code?.toUpperCase() || 'EUR',
        delivered_date: new Date().toLocaleDateString('pt-PT'),
        store_url: process.env.STORE_URL || 'https://suggero.io',
      },
    };

    console.log(`[Order Delivered Subscriber] 📧 Enviando via Notification Module...`);
    await notificationModuleService.createNotifications(notificationData);

    console.log(`[Order Delivered Subscriber] ✅ E-mail de pedido entregue enviado!`);
  } catch (error) {
    console.error(`[Order Delivered Subscriber] ❌ ERRO:`, error);
    if (error instanceof Error) {
      console.error(`[Order Delivered Subscriber] Mensagem:`, error.message);
      console.error(`[Order Delivered Subscriber] Stack:`, error.stack);
    }
  }
}

export const config: SubscriberConfig = {
  event: 'delivery.created', // ✅ EVENTO NATIVO DO MEDUSAJS
};
