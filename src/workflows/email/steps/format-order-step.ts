import { BigNumberValue, OrderWorkflowDTO } from '@medusajs/framework/types';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export interface FormatOrderPreparingDataInput {
  order: OrderWorkflowDTO;
  payment: {
    card: {
      brand?: string;
      last4?: string;
    };
  };
}

export const formatOrderStep = createStep(
  'format-order-preparing-data-step',
  async ({ order, payment }: FormatOrderPreparingDataInput) => {
    const recipientEmail = order.email;

    if (!recipientEmail) {
      throw new Error(`Order ${order.id} não possui e-mail do cliente`);
    }

    const formatCurrency = (value: number | BigNumberValue) => {
      if (value === undefined) return '0 €';
      return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(value));
    };

    const taxTotalsByCode: Record<string, number> = {};

    for (const item of order.items) {
      for (const tl of item.tax_lines) taxTotalsByCode[tl.code] = (taxTotalsByCode[tl.code] || 0) + Number(tl.total);
    }

    for (const sm of order.shipping_methods) {
      for (const tl of sm.tax_lines) taxTotalsByCode[tl.code] = (taxTotalsByCode[tl.code] || 0) + Number(tl.total);
    }

    const taxes = Object.entries(taxTotalsByCode).map(([code, total]) => ({
      name: code,
      value: formatCurrency(total),
    }));

    const formatPaymentMethod = (payment: { card: { brand?: string; last4?: string } }) => {
      const brandName = payment?.card?.brand || 'Card';
      const last4 = payment?.card?.last4 || 'XXXX';

      const normalizedBrand = brandName.charAt(0).toUpperCase() + brandName.slice(1).toLowerCase();

      return `${normalizedBrand} **** ${last4}`;
    };

    const templateData = {
      firstName: order.customer.first_name,
      orderUrl: `${process.env.STORE_URL}/orders/${order}`,
      orderId: order.display_id,

      orderItems: order.items.map((item) => ({
        itemImageUrl: item.thumbnail || '#',
        itemName: item.title,
        itemType: item.product_type || 'Entrega pontual (Mock)',
        itemQuantity: item.quantity,
        itemPrice: formatCurrency(item.total),
      })),

      deliveryAddress: {
        postalCode: order.shipping_address?.postal_code || '',
        city: order.shipping_address?.city || '',
        country: order.shipping_address?.country_code || '',
        street: order.shipping_address?.address_1 || '',
        additionalInfo: order.shipping_address?.address_2 || '',
      },

      invoiceAddress: {
        postalCode: order.billing_address?.postal_code || '',
        city: order.billing_address?.city || '',
        country: order.billing_address?.country_code || '',
        street: order.billing_address?.address_1 || '',
        additionalInfo: order.billing_address?.address_2 || '',
      },

      deliverySchedule: {
        deliveryDate: order.metadata?.delivery_date,
        deliveryTime: order.metadata?.period,
      },

      paymentMethod: {
        paymentName: formatPaymentMethod(payment),
        subtotal: formatCurrency(order.subtotal),
      },

      totalizers: {
        subtotal: formatCurrency(order.item_subtotal),
        taxes,
        shippingPrice: order.shipping_total ? formatCurrency(order.shipping_total) : 'Gratis',
        totalDiscounts: formatCurrency(order.discount_total),
        totalValue: formatCurrency(order.total),
      },
    };

    return new StepResponse({ templateData, recipientEmail });
  },
);
