/**
 * Step: Format Order Delivered Data
 * Formata os dados do pedido para o template "Order Delivered" do SendGrid
 *
 * Este step transforma os dados do MedusaJS no formato esperado pelo template
 * Template ID: d-c0157e4c7a4a4ebe839fae834b9d6168
 */

import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import type { OrderDeliveredEmailData } from '../../../types/email-templates';
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

export interface FormatOrderDeliveredDataInput {
  order: MedusaOrder;
  payment?: MedusaPayment;
}

export const formatOrderDeliveredDataStep = createStep(
  'format-order-delivered-data-step',
  async ({ order, payment }: FormatOrderDeliveredDataInput) => {
    // Formatar os dados do pedido para o template do SendGrid
    const emailData: OrderDeliveredEmailData = {
      firstName: order.customer?.first_name || 'Cliente',
      orderId: formatOrderId(order.display_id || order.id),
      actionUrl: generateActionUrl(order.id),
      orderItems: formatOrderItems(order.items || []),
      deliveryAddress: formatAddress(order.shipping_address),
      invoiceAddress: order.billing_address ? formatAddress(order.billing_address) : null,
      deliverySchedule: formatDeliverySchedule(order),
      paymentMethod: formatPaymentMethod(payment),
      totalizers: formatTotalizers(order),
    };

    // Buscar o email do cliente
    const customerEmail = order.email || order.customer?.email;

    if (!customerEmail) {
      throw new Error(`Order ${order.id} não tem e-mail associado`);
    }

    return new StepResponse({
      emailData,
      recipientEmail: customerEmail,
    });
  },
);
