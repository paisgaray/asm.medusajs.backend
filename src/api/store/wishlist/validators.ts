import { createFindParams, createSelectParams } from '@medusajs/medusa/api/utils/validators';
import { z } from 'zod';

const selectParams = createSelectParams();

export const StoreWishlistListQuerySchema = createFindParams().merge(
  z.object({
    customer_id: z.string(),
  }),
);

export const StoreWishlistRetrieveQuerySchema = selectParams.merge(
  z.object({
    customer_id: z.string().optional(),
  }),
);

export const StoreWishlistCreateSchema = z.object({
  customer_id: z.string(),
});

export const WishlistItemsListQuerySchema = createFindParams().merge(
  z.object({
    customer_id: z.string().optional(),
    product_id: z.string().optional(),
    product_variant_id: z.string().optional(),
    bundle_id: z.string().optional(),
  }),
);

export const WishlistItemCreateSchema = z
  .object({
    product_id: z.string().optional(),
    product_variant_id: z.string().optional(),
    bundle_id: z.string().optional(),
    quantity: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.product_variant_id && !data.bundle_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either product_variant_id or bundle_id is required',
        path: ['product_variant_id'],
      });
    }

    if (data.product_variant_id && data.bundle_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot provide both product_variant_id and bundle_id',
        path: ['product_variant_id'],
      });
    }

    if (data.product_variant_id && !data.product_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'product_id is required when product_variant_id is provided',
        path: ['product_id'],
      });
    }
  });

export const WishlistAddToCartBodySchema = z.object({
  cart_id: z.string().optional(),
});

export const WishlistItemAddToCartBodySchema = WishlistAddToCartBodySchema;

export const WishlistBundleAddToCartBodySchema = WishlistAddToCartBodySchema.extend({
  items: z
    .array(
      z.object({
        item_id: z.string(),
        variant_id: z.string(),
      }),
    )
    .optional(),
});

export type StoreWishlistListQuery = z.infer<typeof StoreWishlistListQuerySchema>;
export type StoreWishlistRetrieveQuery = z.infer<typeof StoreWishlistRetrieveQuerySchema>;
export type StoreWishlistCreateBody = z.infer<typeof StoreWishlistCreateSchema>;
export type WishlistItemsListQuery = z.infer<typeof WishlistItemsListQuerySchema>;
export type WishlistItemCreateBody = z.infer<typeof WishlistItemCreateSchema>;
export type WishlistAddToCartBody = z.infer<typeof WishlistAddToCartBodySchema>;
export type WishlistItemAddToCartBody = z.infer<typeof WishlistItemAddToCartBodySchema>;
export type WishlistBundleAddToCartBody = z.infer<typeof WishlistBundleAddToCartBodySchema>;
