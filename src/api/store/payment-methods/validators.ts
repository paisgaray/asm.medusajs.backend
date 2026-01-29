import { z } from 'zod';

const customerIdSchema = z
  .string()
  .min(1, 'customer_id is required and cannot be empty')
  .refine(
    (val) => {
      const trimmed = val.trim();
      if (trimmed.length === 0) return false;
      if (trimmed.includes('{{') || trimmed.includes('}}')) return false;
      if (trimmed.length < 3) return false;
      return true;
    },
    {
      message: 'customer_id must be a valid customer ID',
    },
  );

export const StorePaymentMethodsListQuerySchema = z.object({
  customer_id: customerIdSchema,
});

export const StoreDeletePaymentMethodBodySchema = z.object({
  account_holder_id: z.string().min(1, 'account_holder_id is required'),
  customer_id: customerIdSchema,
});

export const StoreCreatePaymentMethodBodySchema = z.object({
  customer_id: customerIdSchema,
  provider_id: z.string().min(1, 'provider_id is required'),
  payment_method_id: z.string().min(1, 'payment_method_id is required'),
  metadata: z.record(z.unknown()).optional(),
});

export const StoreUpdatePaymentMethodBodySchema = z.object({
  account_holder_id: z.string().min(1, 'account_holder_id is required'),
  customer_id: customerIdSchema,
  metadata: z.record(z.unknown()).optional(),
});

export type StorePaymentMethodsListQuery = z.infer<typeof StorePaymentMethodsListQuerySchema>;
export type StoreDeletePaymentMethodBody = z.infer<typeof StoreDeletePaymentMethodBodySchema>;
export type StoreCreatePaymentMethodBody = z.infer<typeof StoreCreatePaymentMethodBodySchema>;
export type StoreUpdatePaymentMethodBody = z.infer<typeof StoreUpdatePaymentMethodBodySchema>;
