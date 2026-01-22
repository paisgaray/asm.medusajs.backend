/**
 * Step: Format Order Confirmation Data
 * Formata os dados do pedido para o template "Order Confirmation" do SendGrid
 *
 * Este step transforma os dados do MedusaJS no formato esperado pelo template
 * Template ID: d-51287e3277764d86aea821a1ea60c022
 * 
 * Dados 100% reais do PostgreSQL via query.graph()
 */

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
import { SENDGRID_TEMPLATES } from '../../../utils/sendgrid-templates';

export interface FormatOrderConfirmationDataInput {
  order: MedusaOrder;
  payment?: MedusaPayment;
}

export const formatOrderConfirmationDataStep = createStep(
  'format-order-confirmation-data-step',
  async ({ order, payment }: FormatOrderConfirmationDataInput) => {
    console.log(`[Format Order Confirmation] Formatando dados para order: ${order.id}`);

    // Formatar os dados do pedido para o template do SendGrid
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

    // Buscar o email do cliente
    const customerEmail = order.email || order.customer?.email;

    if (!customerEmail) {
      throw new Error(`Order ${order.id} não tem e-mail associado`);
    }

    console.log(`[Format Order Confirmation] Dados formatados com sucesso`);
    console.log(`[Format Order Confirmation] Email destino: ${customerEmail}`);

    return new StepResponse({
      recipientEmail: customerEmail,
      templateId: SENDGRID_TEMPLATES.ORDER_CONFIRMATION,
      templateData: emailData,
      subject: 'Pedido confirmado', // Assunto em espanhol
    });
  },
);
