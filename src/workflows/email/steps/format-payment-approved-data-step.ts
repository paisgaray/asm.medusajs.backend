/**
 * Step: Format Payment Approved Data
 * Formata os dados do pedido para o template do SendGrid
 */

import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import type { PaymentApprovedEmailData } from '../../../types/email-templates';
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

export interface FormatPaymentApprovedDataInput {
  order: MedusaOrder;
  payment: MedusaPayment;
}

export interface FormatPaymentApprovedDataOutput {
  emailData: PaymentApprovedEmailData;
  recipientEmail: string;
}

export const formatPaymentApprovedDataStep = createStep(
  'format-payment-approved-data-step',
  async ({ order, payment }: FormatPaymentApprovedDataInput) => {
    // Extrair dados do cliente
    const firstName = order.customer?.first_name || order.email?.split('@')[0] || 'Cliente';
    const recipientEmail = order.email;

    if (!recipientEmail) {
      throw new Error(`Order ${order.id} não possui e-mail do cliente`);
    }

    // Formatar endereço de entrega
    const deliveryAddress = formatAddress(order.shipping_address);

    // Formatar endereço de faturação (null se for igual ao de entrega)
    let invoiceAddress = null;
    if (order.billing_address && order.billing_address.id !== order.shipping_address?.id) {
      invoiceAddress = formatAddress(order.billing_address);
    }

    // Formatar itens do pedido
    const orderItems = formatOrderItems(order.items || []);

    // Formatar método de pagamento
    const paymentMethod = formatPaymentMethod(payment);

    // Formatar schedule de entrega
    const deliverySchedule = formatDeliverySchedule(order.shipping_methods?.[0]);

    // Formatar totalizadores
    const totalizers = formatTotalizers(order);

    // Gerar URL de ação
    const actionUrl = generateActionUrl(order.id);

    // Construir dados do e-mail
    const emailData: PaymentApprovedEmailData = {
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
