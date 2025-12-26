import { AdminCreateProduct } from '@medusajs/medusa/api/admin/products/validators';
import { createFindParams, createSelectParams } from '@medusajs/medusa/api/utils/validators';
import { z } from 'zod';

export const selectParams = createSelectParams();
export const findParams = createFindParams();

export const CreateBundledProductsSchema = z.object({
  title: z.string(),
  details: z.string().optional(),
  product: AdminCreateProduct(),
  items: z
    .array(
      z.object({
        product_id: z.string(),
        details: z.string().optional(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
});

export const UpdateBundledProductQuerySchema = z.object({
  id: z.string(),
});

export const UpdateBundledProductSchema = z.object({
  title: z.string(),
  details: z.string().optional(),
  items: z.array(
    z.object({
      product_id: z.string(),
      details: z.string().optional(),
      quantity: z.number(),
    }),
  ),
});

export const UpdateBundledProductItemQuerySchema = z.object({
  id: z.string(),
  itemId: z.string(),
});

export const UpdateBundledProductItemSchema = z.object({
  details: z.string().optional(),
  quantity: z.number(),
});

export type CreateBundledProductsSchema = z.infer<typeof CreateBundledProductsSchema>;
export type UpdateBundledProductQuerySchema = z.infer<typeof UpdateBundledProductQuerySchema>;
export type UpdateBundledProductSchema = z.infer<typeof UpdateBundledProductSchema>;
export type UpdateBundledProductItemQuerySchema = z.infer<typeof UpdateBundledProductItemQuerySchema>;
export type UpdateBundledProductItemSchema = z.infer<typeof UpdateBundledProductItemSchema>;
