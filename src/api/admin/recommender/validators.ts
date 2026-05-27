import { z } from 'zod';

// Individual schemas used for type narrowing in the route
export const BundleRecommenderSchema = z.object({
  type: z.literal('bundle'),
  id_cliente: z.string().default('cliente_id_1'),
  codigo_postal: z.string().default('12345'),
  mes: z.string().default('3'),
  dia: z.string().default('10'),
  hora: z.string().default('14'),
  dia_semana: z.string().default('2'),
  top_k_baskets: z.string().default('10'),
  page_size: z.string().default('5'),
});

export const ProductRecommenderSchema = z.object({
  type: z.literal('product'),
  id_cliente: z.string().default('cliente_id_1'),
  codigo_postal: z.string().default('12345'),
  mes: z.string().default('3'),
  dia: z.string().default('10'),
  hora: z.string().default('14'),
  dia_semana: z.string().default('2'),
  top_k_categories: z.string().default('15'),
  first_k_categories: z.string().default('5'),
  qty_products_first_k_categories: z.string().default('2'),
  qty_products_rest_categories: z.string().default('1'),
  page_size: z.string().default('5'),
});

// Flat schema accepted by validateAndTransformBody (ZodObject required)
export const RecommenderSchema = z.object({
  type: z.enum(['bundle', 'product']),
  id_cliente: z.string().default('cliente_id_1'),
  codigo_postal: z.string().default('12345'),
  mes: z.string().default('3'),
  dia: z.string().default('10'),
  hora: z.string().default('14'),
  dia_semana: z.string().default('2'),
  // bundle-only
  top_k_baskets: z.string().optional(),
  // product-only
  top_k_categories: z.string().optional(),
  first_k_categories: z.string().optional(),
  qty_products_first_k_categories: z.string().optional(),
  qty_products_rest_categories: z.string().optional(),
  // shared
  page_size: z.string().default('5'),
});

export type RecommenderSchema = z.infer<typeof RecommenderSchema>;
export type BundleRecommenderSchema = z.infer<typeof BundleRecommenderSchema>;
export type ProductRecommenderSchema = z.infer<typeof ProductRecommenderSchema>;
