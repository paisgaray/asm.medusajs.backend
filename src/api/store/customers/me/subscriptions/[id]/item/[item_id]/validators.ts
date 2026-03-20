import { z } from 'zod';

export const UpdateSubscriptionItemSchema = z.object({
  quantity: z.number().int().min(1),
});

export type UpdateSubscriptionItemSchema = z.infer<typeof UpdateSubscriptionItemSchema>;
