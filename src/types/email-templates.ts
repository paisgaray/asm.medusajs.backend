/**
 * Email Template Types
 * Baseado no JSON fornecido pelo front-end para integração com SendGrid
 */

export interface OrderItem {
  itemName: string;
  itemType: string;
  itemPrice: string;
  itemImageUrl: string;
  itemQuantity: number;
}

export interface DeliveryAddress {
  postalCode: string;
  city: string;
  country: string;
  street: string;
  additionalInfo?: string;
}

export interface DeliverySchedule {
  deliveryDate: string;
  deliveryTime: string;
}

export interface PaymentMethod {
  paymentName: string;
  paymentBrand: string;
}

export interface Tax {
  name: string;
  value: string;
}

export interface Totalizers {
  subtotal: string;
  shippingPrice: string;
  taxes: Tax[];
  totalDiscounts: string;
  totalValue: string;
}

/**
 * Template: Payment Approved
 * ID: d-dadda7e1dafb4d52b9cd80fc5e546590
 */
export interface PaymentApprovedEmailData {
  firstName: string;
  orderId: string;
  actionUrl: string;
  orderItems: OrderItem[];
  deliveryAddress: DeliveryAddress;
  invoiceAddress: DeliveryAddress | null;
  deliverySchedule: DeliverySchedule;
  paymentMethod: PaymentMethod;
  totalizers: Totalizers;
}

/**
 * Template: Order Confirmed
 * ID: d-51287e3277764d86aea821a1ea60c022
 */
export interface OrderConfirmedEmailData {
  firstName: string;
  orderId: string;
  orderItems: OrderItem[];
  deliveryAddress: DeliveryAddress;
  invoiceAddress: DeliveryAddress | null;
  deliverySchedule: DeliverySchedule;
  paymentMethod: PaymentMethod;
  totalizers: Totalizers;
}

/**
 * Template: Order Invoiced/Preparing/Shipped
 * IDs:
 * - Preparing: d-e0153efc5c184f878e833c2d42ca3247
 * - Invoiced: d-c3c0dd4a6d0a46d6ab25da1ce99f6f89
 * - Shipped: d-4901f2e3d61c47c2b5f9569065c08616
 */
export interface OrderStatusEmailData {
  firstName: string;
  orderId: string;
  actionUrl: string;
  orderItems: OrderItem[];
  deliveryAddress: DeliveryAddress;
  invoiceAddress: DeliveryAddress | null;
  deliverySchedule: DeliverySchedule;
  paymentMethod: PaymentMethod;
  totalizers: Totalizers;
}

/**
 * Template: Order Delivered
 * ID: d-c0157e4c7a4a4ebe839fae834b9d6168
 */
export interface OrderDeliveredEmailData {
  firstName: string;
  orderId: string;
  orderItems: OrderItem[];
  deliveryAddress: DeliveryAddress;
  invoiceAddress: DeliveryAddress | null;
  deliverySchedule: DeliverySchedule;
  paymentMethod: PaymentMethod;
  totalizers: Totalizers;
}

/**
 * Template: Payment Not Approved
 * ID: d-b23249abe881427f8badc774880eba76
 */
export interface PaymentNotApprovedEmailData {
  firstName: string;
  orderId: string;
  actionUrl: string;
  orderItems: OrderItem[];
  paymentMethod: PaymentMethod;
}

/**
 * Template: Order Invoiced (específico)
 * ID: d-c3c0dd4a6d0a46d6ab25da1ce99f6f89
 * Alias para OrderStatusEmailData
 */
export type OrderInvoicedEmailData = OrderStatusEmailData;

/**
 * Template: Reset Password
 * ID: d-97f70554211843c08e630e384ae6951f
 */
export interface ResetPasswordEmailData {
  actionUrl: string;
}
