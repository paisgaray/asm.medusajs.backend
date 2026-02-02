import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';

console.log('[Payment Not Approved Subscriber] Subscriber carregado - SISTEMA NATIVO MedusaJS!');

export default async function handlePaymentNotApproved({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const paymentId = data.id;
  const timestamp = new Date().toISOString();

  console.log(`[Payment Not Approved Subscriber] ✅ Evento payment.failed capturado!`);
  console.log(`[Payment Not Approved Subscriber] Payment ID: ${paymentId}`);
  console.log(`[Payment Not Approved Subscriber] Timestamp: ${timestamp}`);

  try {
    // 1. Buscar dados do pedido via payment
    const paymentModuleService = container.resolve(Modules.PAYMENT);
    const orderModuleService = container.resolve(Modules.ORDER);
    
    console.log(`[Payment Not Approved Subscriber] Buscando payment ${paymentId}...`);
    const payment = await paymentModuleService.retrievePayment(paymentId);
    
    if (!payment || !payment.order_id) {
      console.error(`[Payment Not Approved Subscriber] ❌ Payment ou order_id não encontrado`);
      return;
    }
    
    console.log(`[Payment Not Approved Subscriber] Buscando order ${payment.order_id}...`);
    const order = await orderModuleService.retrieveOrder(payment.order_id);
    
    if (!order || !order.email) {
      console.error(`[Payment Not Approved Subscriber] ❌ Order ou email não encontrado`);
      return;
    }

    console.log(`[Payment Not Approved Subscriber] ✅ Dados encontrados:`);
    console.log(`[Payment Not Approved Subscriber] Order ID: ${order.display_id}`);
    console.log(`[Payment Not Approved Subscriber] Email: ${order.email}`);

    // 2. Enviar via Notification Module (Sistema Nativo)
    const notificationModuleService = container.resolve(Modules.NOTIFICATION);
    
    const notificationData = {
      to: order.email,
      channel: 'email',
      template: 'd-b23249abe881427f8badc774880eba76', // PAYMENT_NOT_APPROVED
      data: {
        order_id: order.display_id,
        customer_first_name: order.billing_address?.first_name || 'Cliente',
        payment_amount: (payment.amount / 100).toFixed(2),
        currency_code: payment.currency_code?.toUpperCase() || 'EUR',
        payment_date: new Date(payment.created_at).toLocaleDateString('pt-PT'),
        store_url: process.env.STORE_URL || 'https://suggero.io',
      },
    };

    console.log(`[Payment Not Approved Subscriber] 📧 Enviando via Notification Module...`);
    const result = await notificationModuleService.createNotifications(notificationData);

    console.log(`[Payment Not Approved Subscriber] ✅ E-mail de pagamento rejeitado enviado!`);
    console.log(`[Payment Not Approved Subscriber] Result:`, JSON.stringify(result, null, 2));

  } catch (error) {
    console.error(`[Payment Not Approved Subscriber] ❌ ERRO:`, error);
    if (error instanceof Error) {
      console.error(`[Payment Not Approved Subscriber] Mensagem:`, error.message);
      console.error(`[Payment Not Approved Subscriber] Stack:`, error.stack);
    }
  }
}

export const config: SubscriberConfig = {
  event: 'payment.failed', // ✅ EVENTO CORRETO: quando pagamento falha
};
