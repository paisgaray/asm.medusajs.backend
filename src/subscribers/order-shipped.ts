import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';

console.log('[Order Shipped Subscriber] Subscriber carregado - SISTEMA NATIVO MedusaJS!');

export default async function handleOrderShipped({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; order_id: string }>) {
  const shipmentId = data.id;
  const orderId = data.order_id;
  const timestamp = new Date().toISOString();

  console.log(`[Order Shipped Subscriber] ✅ Evento order.shipment_created capturado!`);
  console.log(`[Order Shipped Subscriber] Shipment ID: ${shipmentId}`);
  console.log(`[Order Shipped Subscriber] Order ID: ${orderId}`);
  console.log(`[Order Shipped Subscriber] Timestamp: ${timestamp}`);

  try {
    // 1. Buscar dados do pedido
    const orderModuleService = container.resolve(Modules.ORDER);

    console.log(`[Order Shipped Subscriber] Buscando order ${orderId}...`);
    const order = await orderModuleService.retrieveOrder(orderId);

    if (!order || !order.email) {
      console.error(`[Order Shipped Subscriber] ❌ Order ou email não encontrado`);
      return;
    }

    console.log(`[Order Shipped Subscriber] ✅ Dados encontrados:`);
    console.log(`[Order Shipped Subscriber] Order ID: ${order.display_id}`);
    console.log(`[Order Shipped Subscriber] Email: ${order.email}`);

    // 2. Enviar via Notification Module (Sistema Nativo)
    const notificationModuleService = container.resolve(Modules.NOTIFICATION);
    const notificationData = {
      to: order.email,
      channel: 'email',
      template: 'd-4901f2e3d61c47c2b5f9569065c08616', // ORDER_SHIPPED
      data: {
        order_id: order.display_id,
        customer_first_name: order.billing_address?.first_name || 'Cliente',
        order_total: (Number(order.total) / 100).toFixed(2),
        currency_code: order.currency_code?.toUpperCase() || 'EUR',
        shipped_date: new Date().toLocaleDateString('pt-PT'),
        tracking_number: shipmentId, // Usar shipment ID como tracking temporário
        store_url: process.env.STORE_URL || 'https://suggero.io',
      },
    };

    console.log(`[Order Shipped Subscriber] 📧 Enviando via Notification Module...`);
    await notificationModuleService.createNotifications(notificationData);

    console.log(`[Order Shipped Subscriber] ✅ E-mail de pedido enviado enviado!`);
  } catch (error) {
    console.error(`[Order Shipped Subscriber] ❌ ERRO:`, error);
    if (error instanceof Error) {
      console.error(`[Order Shipped Subscriber] Mensagem:`, error.message);
      console.error(`[Order Shipped Subscriber] Stack:`, error.stack);
    }
  }
}

export const config: SubscriberConfig = {
  event: 'order.shipment_created', // ✅ EVENTO NATIVO DO MEDUSAJS
};
