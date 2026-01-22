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
 * Mapeamento de payment brands para URLs de ícones do SendGrid
 */
const PAYMENT_BRAND_ICONS: Record<string, string> = {
  Visa: 'http://cdn.mcauto-images-production.sendgrid.net/38d5e4554911314a/677aa336-9aab-49f7-9195-ee84945139b2/42x31.png',
  Master:
    'http://cdn.mcauto-images-production.sendgrid.net/38d5e4554911314a/0803d096-b39f-446f-af7b-df4050fbd309/42x31.png',
  MasterCard:
    'http://cdn.mcauto-images-production.sendgrid.net/38d5e4554911314a/0803d096-b39f-446f-af7b-df4050fbd309/42x31.png',
  GooglePay:
    'http://cdn.mcauto-images-production.sendgrid.net/38d5e4554911314a/e238626e-2468-46d7-9b2b-415c081651b7/42x31.png',
  Discover:
    'http://cdn.mcauto-images-production.sendgrid.net/38d5e4554911314a/754a49a6-8d6d-43e6-b4df-1823654c903b/42x31.png',
  Dinners:
    'http://cdn.mcauto-images-production.sendgrid.net/38d5e4554911314a/37c1d5ce-6d44-47d5-a3ef-6940bfd2e6c4/42x31.png',
  Bizum:
    'http://cdn.mcauto-images-production.sendgrid.net/38d5e4554911314a/5d3439ef-2c34-4f47-9a1a-dbccd4bf4b61/42x31.png',
  ApplePay:
    'http://cdn.mcauto-images-production.sendgrid.net/38d5e4554911314a/a2a6526c-cfc8-4fa1-9610-eca09b28b394/42x31.png',
  Amex: 'http://cdn.mcauto-images-production.sendgrid.net/38d5e4554911314a/784e1b9e-5467-4382-997e-be2fc88c779b/42x31.png',
  'American Express':
    'http://cdn.mcauto-images-production.sendgrid.net/38d5e4554911314a/784e1b9e-5467-4382-997e-be2fc88c779b/42x31.png',
};

/**
 * Formata método de pagamento
 * Retorna paymentBrand como URL do ícone conforme solicitado pelo front-end
 */
export function formatPaymentMethod(payment?: MedusaPayment | null): PaymentMethod {
  const brandName = payment?.data?.brand || payment?.provider_id || 'Visa';
  const last4 = payment?.data?.last4 || '****';

  const normalizedBrand = brandName.charAt(0).toUpperCase() + brandName.slice(1).toLowerCase();
  const brandIconUrl = PAYMENT_BRAND_ICONS[normalizedBrand] || PAYMENT_BRAND_ICONS.Visa;

  return {
    paymentName: `${normalizedBrand} **** ${last4}`,
    paymentBrand: brandIconUrl,
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
export function formatOrderId(displayId: string | number): string {
  return `#${displayId}`;
}
