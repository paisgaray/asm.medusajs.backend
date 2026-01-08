import { z } from 'zod';

export const StoreProductSearchBodySchema = z.object({
  query: z.string(),
  filters: z.string().optional(),
  page: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  language: z.string().optional(),
});

export type StoreProductSearchBody = z.infer<typeof StoreProductSearchBodySchema>;
