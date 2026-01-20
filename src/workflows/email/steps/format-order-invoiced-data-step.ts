/**
 * Step: Format Order Invoiced Data
 * Formata os dados do pedido faturado para o template do SendGrid
 */

import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import type { OrderInvoicedEmailData } from '../../../types/email-templates';
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

export interface FormatOrderInvoicedDataInput {
  order: MedusaOrder;
  payment?: MedusaPayment;
}

export interface FormatOrderInvoicedDataOutput {
  emailData: OrderInvoicedEmailData;
  recipientEmail: string;
}

export const formatOrderInvoicedDataStep = createStep(
  'format-order-invoiced-data-step',
  async ({ order, payment }: FormatOrderInvoicedDataInput) => {
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

    // Formatar método de pagamento (se disponível)
    const paymentMethod = payment ? formatPaymentMethod(payment) : {
      paymentName: 'Pagamento processado',
      paymentBrand: 'N/A',
    };

    // Formatar schedule de entrega
    const deliverySchedule = formatDeliverySchedule(order.shipping_methods?.[0]);

    // Formatar totalizadores
    const totalizers = formatTotalizers(order);

    // Gerar URL de ação
    const actionUrl = generateActionUrl(order.id);

    // Construir dados do e-mail
    const emailData: OrderInvoicedEmailData = {
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
