/**
 * MedusaJS Data Types
 * Tipos específicos para os dados retornados pelo MedusaJS
 */

export interface MedusaAddress {
  id: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  country_code?: string;
  postal_code?: string;
  company?: string;
  metadata?: Record<string, unknown>;
}

export interface MedusaProduct {
  id: string;
  title: string;
  thumbnail?: string;
}

export interface MedusaVariant {
  id: string;
  product?: MedusaProduct;
}

export interface MedusaOrderItem {
  id: string;
  title?: string;
  quantity: number;
  unit_price: number;
  currency_code: string;
  thumbnail?: string;
  variant?: MedusaVariant;
  metadata?: Record<string, unknown>;
}

export interface MedusaCustomer {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
}

export interface MedusaShippingMethod {
  id: string;
  name?: string;
  metadata?: {
    estimated_delivery_date?: string;
    delivery_time?: string;
    [key: string]: unknown;
  };
}

export interface MedusaPaymentCollection {
  id: string;
  order_id?: string;
  payments?: Array<{
    id: string;
    provider_id?: string;
    data?: {
      brand?: string;
      last4?: string;
      [key: string]: unknown;
    };
  }>;
}

export interface MedusaPayment {
  id: string;
  provider_id?: string;
  payment_collection?: MedusaPaymentCollection;
  data?: {
    brand?: string;
    last4?: string;
    [key: string]: unknown;
  };
}

export interface MedusaOrder {
  id: string;
  display_id: number;
  email: string;
  currency_code: string;
  subtotal: number;
  total: number;
  tax_total: number;
  shipping_total: number;
  discount_total: number;
  items?: MedusaOrderItem[];
  customer?: MedusaCustomer;
  shipping_address?: MedusaAddress;
  billing_address?: MedusaAddress;
  shipping_methods?: MedusaShippingMethod[];
  payment_collection?: MedusaPaymentCollection;
}
