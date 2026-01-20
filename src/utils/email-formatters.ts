/**
 * Email Formatters
 * Helpers para transformar dados do MedusaJS no formato esperado pelos templates do SendGrid
 */

import type {
  DeliveryAddress,
  DeliverySchedule,
  OrderItem,
  PaymentMethod,
  Tax,
  Totalizers,
} from '../types/email-templates';
import type {
  MedusaAddress,
  MedusaOrder,
  MedusaOrderItem,
  MedusaPayment,
  MedusaShippingMethod,
} from '../types/medusa-data';

/**
 * Formata valor monetário para o formato esperado (ex: "44,55 €")
 */
export function formatCurrency(amount: number, _currencyCode: string = 'EUR'): string {
  const formatted = new Intl.NumberFormat('pt-PT', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100); // MedusaJS armazena em centavos

  return `${formatted} €`;
}

/**
 * Formata endereço de entrega/faturação
 */
export function formatAddress(address: MedusaAddress): DeliveryAddress {
  const additionalInfo = address.metadata?.additionalInfo;

  return {
    postalCode: address.postal_code || '',
    city: address.city || '',
    country: address.country_code?.toUpperCase() || '',
    street: [address.address_1, address.address_2].filter(Boolean).join(', '),
    additionalInfo: typeof additionalInfo === 'string' ? additionalInfo : address.company || undefined,
  };
}

/**
 * Formata data de entrega
 */
export function formatDeliverySchedule(shippingMethod: MedusaShippingMethod): DeliverySchedule {
  // Você pode ajustar conforme sua lógica de data estimada
  const estimatedDate = shippingMethod?.metadata?.estimated_delivery_date;
  const deliveryTime = shippingMethod?.metadata?.delivery_time || 'Mañana';

  return {
    deliveryDate: estimatedDate || new Date().toLocaleDateString('pt-PT'),
    deliveryTime,
  };
}

/**
 * Formata método de pagamento
 */
export function formatPaymentMethod(payment: MedusaPayment): PaymentMethod {
  const brand = payment.data?.brand || payment.provider_id || 'Card';
  const last4 = payment.data?.last4 || '****';

  return {
    paymentName: `${brand} **** ${last4}`,
    paymentBrand: brand,
  };
}

/**
 * Formata itens do pedido
 */
export function formatOrderItems(items: MedusaOrderItem[]): OrderItem[] {
  return items.map((item) => {
    // Determinar tipo de item baseado em metadata ou subscription
    const itemType = item.metadata?.subscription ? 'Subscrición semanal' : 'Entrega pontual';

    return {
      itemName: item.variant?.product?.title || item.title || 'Produto',
      itemType,
      itemPrice: formatCurrency(item.unit_price, item.currency_code),
      itemImageUrl: item.variant?.product?.thumbnail || item.thumbnail || 'https://placehold.co/80x80',
      itemQuantity: item.quantity,
    };
  });
}

/**
 * Formata totalizadores (subtotal, impostos, descontos, etc)
 */
export function formatTotalizers(order: MedusaOrder): Totalizers {
  const taxes: Tax[] = [];

  // Processar impostos
  if (order.tax_total > 0) {
    taxes.push({
      name: 'IVA',
      value: formatCurrency(order.tax_total, order.currency_code),
    });
  }

  return {
    subtotal: formatCurrency(order.subtotal, order.currency_code),
    shippingPrice: order.shipping_total > 0 ? formatCurrency(order.shipping_total, order.currency_code) : 'Gratis',
    taxes,
    totalDiscounts: formatCurrency(order.discount_total || 0, order.currency_code),
    totalValue: formatCurrency(order.total, order.currency_code),
  };
}

/**
 * Gera URL de ação para o cliente (tracking do pedido)
 */
export function generateActionUrl(orderId: string): string {
  const storeUrl = process.env.STORE_URL || 'https://store.example.com';
  return `${storeUrl}/orders/${orderId}`;
}

/**
 * Formata ID do pedido para exibição (ex: #545225232)
 */
export function formatOrderId(displayId: number): string {
  return `#${displayId}`;
}
