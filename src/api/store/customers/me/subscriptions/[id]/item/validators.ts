import { z } from 'zod';

export const AddSubscriptionItemSchema = z.object({
  product_id: z.string(),
});

export type AddSubscriptionItemSchema = z.infer<typeof AddSubscriptionItemSchema>;
