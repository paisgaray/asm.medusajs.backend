import { z } from 'zod';

export const UpdateSubscriptionPaymentMethodSchema = z.object({
  payment_method_id: z.string().min(1, 'payment_method_id is required'),
  set_as_default: z.boolean().optional().default(false),
});

export type UpdateSubscriptionPaymentMethodSchema = z.infer<typeof UpdateSubscriptionPaymentMethodSchema>;
