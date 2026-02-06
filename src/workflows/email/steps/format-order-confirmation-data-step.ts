import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import type { OrderConfirmationEmailData } from '../../../types/email-templates';
import type { MedusaOrder, MedusaPayment } from '../../../types/medusa-data';
import {
  formatAddress,
  formatDeliverySchedule,
  formatOrderId,
  formatOrderItems,
  formatPaymentMethod,
  formatTotalizers,
} from '../../../utils/email-formatters';

export interface FormatOrderConfirmationDataInput {
  order: MedusaOrder;
  payment?: MedusaPayment;
}

export interface FormatOrderConfirmationDataOutput {
  emailData: OrderConfirmationEmailData;
  recipientEmail: string;
}

export const formatOrderConfirmationDataStep = createStep(
  'format-order-confirmation-data-step',
  async ({ order, payment }: FormatOrderConfirmationDataInput) => {
    console.log(`[FormatOrderConfirmation Step] Formatando dados do pedido...`);
    console.log(`[FormatOrderConfirmation Step] Order ID: ${order.id}`);

    const recipientEmail = order.email || order.customer?.email;
    console.log(`[FormatOrderConfirmation Step] Email do pedido: ${order.email}`);
    console.log(`[FormatOrderConfirmation Step] Email do customer: ${order.customer?.email}`);
    console.log(`[FormatOrderConfirmation Step] Email destinatário final: ${recipientEmail}`);

    if (!recipientEmail) {
      console.error(`[FormatOrderConfirmation Step] ❌ Order ${order.id} não tem e-mail associado!`);
      throw new Error(`Order ${order.id} não tem e-mail associado`);
    }

    console.log(`[FormatOrderConfirmation Step] Formatando dados do template...`);
    const emailData: OrderConfirmationEmailData = {
      firstName: order.customer?.first_name || order.email?.split('@')[0] || 'Cliente',
      orderId: formatOrderId(order.display_id || order.id),
      orderItems: formatOrderItems(order.items || []),
      deliveryAddress: formatAddress(order.shipping_address),
      invoiceAddress: order.billing_address ? formatAddress(order.billing_address) : null,
      deliverySchedule: formatDeliverySchedule(order),
      paymentMethod: formatPaymentMethod(payment),
      totalizers: formatTotalizers(order),
    };

    console.log(`[FormatOrderConfirmation Step] ✅ Dados formatados com sucesso!`);
    console.log(`[FormatOrderConfirmation Step] First Name: ${emailData.firstName}`);
    console.log(`[FormatOrderConfirmation Step] Order ID formatado: ${emailData.orderId}`);
    console.log(`[FormatOrderConfirmation Step] Total de itens: ${emailData.orderItems.length}`);
    console.log(`[FormatOrderConfirmation Step] Total do pedido: ${emailData.totalizers.totalValue}`);

    return new StepResponse({ emailData, recipientEmail });
  },
);
