import { z } from 'zod';

export const StoreProductSearchBodySchema = z.object({
  query: z.string(),
});

export type StoreProductSearchBody = z.infer<typeof StoreProductSearchBodySchema>;
