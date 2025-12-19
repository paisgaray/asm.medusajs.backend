import { z } from 'zod';

export const StoreProductSearchBodySchema = z.object({
  query: z.string().min(0), // String vazia "" retorna todos os produtos
  language: z.string().optional(),
  filters: z.string().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  sortBy: z.string().optional(),
});

export type StoreProductSearchBody = z.infer<typeof StoreProductSearchBodySchema>;
