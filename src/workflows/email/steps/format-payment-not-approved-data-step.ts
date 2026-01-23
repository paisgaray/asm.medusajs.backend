/**
 * Step: Format Payment Not Approved Data
 * Formata os dados do pedido para o template de pagamento não aprovado
 */

import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import type { PaymentNotApprovedEmailData } from '../../../types/email-templates';
import type { MedusaOrder, MedusaPayment } from '../../../types/medusa-data';
import {
  formatOrderId,
  formatOrderItems,
  formatPaymentMethod,
  generateActionUrl,
} from '../../../utils/email-formatters';

export interface FormatPaymentNotApprovedDataInput {
  order: MedusaOrder;
  payment: MedusaPayment;
}

export interface FormatPaymentNotApprovedDataOutput {
  emailData: PaymentNotApprovedEmailData;
  recipientEmail: string;
}

export const formatPaymentNotApprovedDataStep = createStep(
  'format-payment-not-approved-data-step',
  async ({ order, payment }: FormatPaymentNotApprovedDataInput) => {
    // Extrair dados do cliente
    const firstName = order.customer?.first_name || order.email?.split('@')[0] || 'Cliente';
    const recipientEmail = order.email;

    if (!recipientEmail) {
      throw new Error(`Order ${order.id} não possui e-mail do cliente`);
    }

    // Formatar itens do pedido
    const orderItems = formatOrderItems(order.items || []);

    // Formatar método de pagamento (que falhou)
    const paymentMethod = formatPaymentMethod(payment);

    // Gerar URL de ação (para tentar novamente)
    const actionUrl = generateActionUrl(order.id);

    // Construir dados do e-mail
    const emailData: PaymentNotApprovedEmailData = {
      firstName,
      orderId: formatOrderId(order.display_id),
      actionUrl,
      orderItems,
      paymentMethod,
    };

    return new StepResponse({ emailData, recipientEmail });
  },
);
