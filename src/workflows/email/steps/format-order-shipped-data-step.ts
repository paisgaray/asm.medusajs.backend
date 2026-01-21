/**
 * Step: Format Order Shipped Data
 * Formata os dados do pedido para o template "Order Shipped" do SendGrid
 *
 * Este step transforma os dados do MedusaJS no formato esperado pelo template
 * Template ID: d-4901f2e3d61c47c2b5f9569065c08616
 */

import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import type { OrderShippedEmailData } from '../../../types/email-templates';
import type { MedusaOrder, MedusaPayment } from '../../../types/medusa-data';
import {
  formatAddress,
  formatDeliverySchedule,
  formatOrderId,
  formatOrderItems,
  formatPaymentMethod,
  formatTotalizers,
  generateActionUrl,
} from '../../../utils/email-formatters';

export interface FormatOrderShippedDataInput {
  order: MedusaOrder;
  payment: MedusaPayment;
}

export interface FormatOrderShippedDataOutput {
  emailData: OrderShippedEmailData;
  recipientEmail: string;
}

export const formatOrderShippedDataStep = createStep(
  'format-order-shipped-data-step',
  async ({ order, payment }: FormatOrderShippedDataInput) => {
    // Extrair nome do cliente
    const firstName = order.customer?.first_name || order.email?.split('@')[0] || 'Cliente';

    // E-mail de destino
    const recipientEmail = order.email;

    if (!recipientEmail) {
      throw new Error(`Order ${order.id} não possui e-mail do cliente`);
    }

    // Formatar endereço de entrega
    const deliveryAddress = formatAddress(order.shipping_address);

    // Formatar endereço de faturamento (se diferente)
    let invoiceAddress = null;
    if (order.billing_address && order.billing_address.id !== order.shipping_address?.id) {
      invoiceAddress = formatAddress(order.billing_address);
    }

    // Formatar itens do pedido
    const orderItems = formatOrderItems(order.items || []);

    // Formatar método de pagamento
    const paymentMethod = formatPaymentMethod(payment);

    // Formatar agendamento de entrega
    const deliverySchedule = formatDeliverySchedule(order.shipping_methods?.[0]);

    // Formatar totalizadores
    const totalizers = formatTotalizers(order);

    // Gerar URL de ação (link para tracking)
    const actionUrl = generateActionUrl(order.id);

    // Montar estrutura do e-mail
    const emailData: OrderShippedEmailData = {
      firstName,
      orderId: formatOrderId(order.display_id),
      actionUrl,
      orderItems,
      deliveryAddress,
      invoiceAddress,
      deliverySchedule,
      paymentMethod,
      totalizers,
    };

    return new StepResponse({ emailData, recipientEmail });
  },
);
