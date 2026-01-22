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
    const recipientEmail = order.email || order.customer?.email;

    if (!recipientEmail) {
      throw new Error(`Order ${order.id} não tem e-mail associado`);
    }

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

    return new StepResponse({ emailData, recipientEmail });
  },
);
