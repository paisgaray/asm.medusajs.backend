import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import type { OrderPreparingEmailData } from '../../../types/email-templates';
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

export interface FormatOrderPreparingDataInput {
  order: MedusaOrder;
  payment: MedusaPayment;
}

export interface FormatOrderPreparingDataOutput {
  emailData: OrderPreparingEmailData;
  recipientEmail: string;
}

export const formatOrderPreparingDataStep = createStep(
  'format-order-preparing-data-step',
  async ({ order, payment }: FormatOrderPreparingDataInput) => {
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

    // Gerar URL de ação (link para acompanhar pedido)
    const actionUrl = generateActionUrl(order.id);

    // Montar estrutura do e-mail
    const emailData: OrderPreparingEmailData = {
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
