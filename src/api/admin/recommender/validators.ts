import { z } from 'zod';

const BaseRecommenderSchema = z.object({
  id_cliente: z.string().default('cliente_id_1'),
  codigo_postal: z.string().default('12345'),
  mes: z.string().default('3'),
  dia: z.string().default('10'),
  hora: z.string().default('14'),
  dia_semana: z.string().default('2'),
});

export const BundleRecommenderSchema = BaseRecommenderSchema.extend({
  type: z.literal('bundle'),
  top_k_baskets: z.string().default('10'),
  page_size: z.string().default('5'),
});

export const ProductRecommenderSchema = BaseRecommenderSchema.extend({
  type: z.literal('product'),
  top_k_categories: z.string().default('15'),
  first_k_categories: z.string().default('5'),
  qty_products_first_k_categories: z.string().default('2'),
  qty_products_rest_categories: z.string().default('1'),
  page_size: z.string().default('5'),
});

export const RecommenderSchema = z.discriminatedUnion('type', [BundleRecommenderSchema, ProductRecommenderSchema]);

export type RecommenderSchema = z.infer<typeof RecommenderSchema>;
export type BundleRecommenderSchema = z.infer<typeof BundleRecommenderSchema>;
export type ProductRecommenderSchema = z.infer<typeof ProductRecommenderSchema>;
