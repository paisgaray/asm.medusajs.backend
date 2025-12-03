import { z } from 'zod';

export const StoreProductSearchBodySchema = z.object({
  query: z.string().min(1, 'Query is required'),
});

export type StoreProductSearchBody = z.infer<typeof StoreProductSearchBodySchema>;
