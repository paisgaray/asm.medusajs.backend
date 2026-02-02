import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';

console.log('[Payment Captured Subscriber] Subscriber carregado - SISTEMA NATIVO MedusaJS!');

export default async function handlePaymentCaptured({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const paymentId = data.id;
  const timestamp = new Date().toISOString();

  console.log(`[Payment Captured Subscriber] ✅ Evento payment.captured capturado!`);
  console.log(`[Payment Captured Subscriber] Payment ID: ${paymentId}`);
  console.log(`[Payment Captured Subscriber] Timestamp: ${timestamp}`);

  try {
    // 1. Buscar dados do pedido via payment
    const paymentModuleService = container.resolve(Modules.PAYMENT);
    const orderModuleService = container.resolve(Modules.ORDER);
    
    console.log(`[Payment Captured Subscriber] Buscando payment ${paymentId}...`);
    const payment = await paymentModuleService.retrievePayment(paymentId);
    
    if (!payment || !payment.order_id) {
      console.error(`[Payment Captured Subscriber] ❌ Payment ou order_id não encontrado`);
      return;
    }
    
    console.log(`[Payment Captured Subscriber] Buscando order ${payment.order_id}...`);
    const order = await orderModuleService.retrieveOrder(payment.order_id);
    
    if (!order || !order.email) {
      console.error(`[Payment Captured Subscriber] ❌ Order ou email não encontrado`);
      return;
    }

    console.log(`[Payment Captured Subscriber] ✅ Dados encontrados:`);
    console.log(`[Payment Captured Subscriber] Order ID: ${order.display_id}`);
    console.log(`[Payment Captured Subscriber] Email: ${order.email}`);

    // 2. Enviar APENAS e-mail de ORDER_INVOICED (o ORDER_CONFIRMATION já é enviado pelo outro subscriber)
    const notificationModuleService = container.resolve(Modules.NOTIFICATION);
    
    const orderInvoicedData = {
      to: order.email,
      channel: 'email',
      template: 'd-c3c0dd4a6d0a46d6ab25da1ce99f6f89', // ORDER_INVOICED
      data: {
        order_id: order.display_id,
        customer_first_name: order.billing_address?.first_name || 'Cliente',
        order_total: (order.total / 100).toFixed(2),
        currency_code: order.currency_code?.toUpperCase() || 'EUR',
        invoice_date: new Date().toLocaleDateString('pt-PT'),
        store_url: process.env.STORE_URL || 'https://suggero.io',
      },
    };

    console.log(`[Payment Captured Subscriber] 📧 Enviando ORDER_INVOICED via Notification Module...`);
    const result = await notificationModuleService.createNotifications(orderInvoicedData);
    console.log(`[Payment Captured Subscriber] ✅ E-mail de pedido faturado enviado!`);

    console.log(`[Payment Captured Subscriber] ✅ Processamento concluído!`);

  } catch (error) {
    console.error(`[Payment Captured Subscriber] ❌ ERRO:`, error);
    if (error instanceof Error) {
      console.error(`[Payment Captured Subscriber] Mensagem:`, error.message);
      console.error(`[Payment Captured Subscriber] Stack:`, error.stack);
    }
  }
}

export const config: SubscriberConfig = {
  event: 'payment.captured', // ✅ EVENTO CORRETO
};
