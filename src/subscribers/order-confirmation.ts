import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';

console.log('[Order Confirmation Subscriber] Subscriber carregado - SISTEMA NATIVO MedusaJS!');

export default async function handleOrderConfirmation({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const paymentId = data.id;
  const timestamp = new Date().toISOString();

  console.log(`[Order Confirmation Subscriber] ✅ Evento payment.captured capturado!`);
  console.log(`[Order Confirmation Subscriber] Payment ID: ${paymentId}`);
  console.log(`[Order Confirmation Subscriber] Timestamp: ${timestamp}`);

  try {
    // 1. Buscar dados do pedido via payment
    const paymentModuleService = container.resolve(Modules.PAYMENT);
    const orderModuleService = container.resolve(Modules.ORDER);
    
    console.log(`[Order Confirmation Subscriber] Buscando payment ${paymentId}...`);
    const payment = await paymentModuleService.retrievePayment(paymentId);
    
    if (!payment || !payment.order_id) {
      console.error(`[Order Confirmation Subscriber] ❌ Payment ou order_id não encontrado`);
      return;
    }
    
    console.log(`[Order Confirmation Subscriber] Buscando order ${payment.order_id}...`);
    const order = await orderModuleService.retrieveOrder(payment.order_id);
    
    if (!order || !order.email) {
      console.error(`[Order Confirmation Subscriber] ❌ Order ou email não encontrado`);
      return;
    }

    console.log(`[Order Confirmation Subscriber] ✅ Dados encontrados:`);
    console.log(`[Order Confirmation Subscriber] Order ID: ${order.display_id}`);
    console.log(`[Order Confirmation Subscriber] Email: ${order.email}`);

    // 2. Enviar via Notification Module (Sistema Nativo)
    const notificationModuleService = container.resolve(Modules.NOTIFICATION);
    
    const notificationData = {
      to: order.email,
      channel: 'email',
      template: 'd-51287e3277764d86aea821a1ea60c022', // ORDER_CONFIRMATION
      data: {
        order_id: order.display_id,
        customer_first_name: order.billing_address?.first_name || 'Cliente',
        order_total: (order.total / 100).toFixed(2),
        currency_code: order.currency_code?.toUpperCase() || 'EUR',
        order_date: new Date(order.created_at).toLocaleDateString('pt-PT'),
        store_url: process.env.STORE_URL || 'https://suggero.io',
      },
    };

    console.log(`[Order Confirmation Subscriber] 📧 Enviando via Notification Module...`);
    const result = await notificationModuleService.createNotifications(notificationData);

    console.log(`[Order Confirmation Subscriber] ✅ E-mail de confirmação enviado!`);
    console.log(`[Order Confirmation Subscriber] Result:`, JSON.stringify(result, null, 2));

  } catch (error) {
    console.error(`[Order Confirmation Subscriber] ❌ ERRO:`, error);
    if (error instanceof Error) {
      console.error(`[Order Confirmation Subscriber] Mensagem:`, error.message);
      console.error(`[Order Confirmation Subscriber] Stack:`, error.stack);
    }
  }
}

export const config: SubscriberConfig = {
  event: 'payment.captured', // ✅ EVENTO CORRETO: quando pagamento é aprovado
};
