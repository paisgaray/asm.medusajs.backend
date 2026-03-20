import { z } from 'zod';

export const AddSubscriptionItemSchema = z.object({
  product_id: z.string(),
  quantity: z.number().int().min(1).default(1),
});

export type AddSubscriptionItemSchema = z.infer<typeof AddSubscriptionItemSchema>;
