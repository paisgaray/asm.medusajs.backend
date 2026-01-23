import { createFindParams, createSelectParams } from '@medusajs/medusa/api/utils/validators';
import { z } from 'zod';

const selectParams = createSelectParams();

const WishlistSingleItemSchema = z
  .object({
    product_id: z.string(),
    product_variant_id: z.string(),
    quantity: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.product_variant_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'product_variant_id is required',
        path: ['product_variant_id'],
      });
    }

    if (!data.product_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'product_id is required when product_variant_id is provided',
        path: ['product_id'],
      });
    }
  });

export const StoreWishlistListQuerySchema = createFindParams().merge(
  z.object({
    customer_id: z.string(),
  }),
);

export const StoreWishlistRetrieveQuerySchema = selectParams.merge(
  z.object({
    customer_id: z.string().optional(),
    region_id: z.string().optional(),
  }),
);

const customerIdSchema = z
  .string()
  .min(1, 'customer_id is required and cannot be empty')
  .refine(
    (val) => {
      const trimmed = val.trim();
      if (trimmed.length === 0) return false;
      if (trimmed.includes('{{') || trimmed.includes('}}')) return false;
      if (trimmed.length < 3) return false;
      return true;
    },
    {
      message: 'customer_id must be a valid customer ID',
    },
  );

export const StoreWishlistCreateSchema = z.object({
  customer_id: customerIdSchema,
  name: z.string().optional(),
});

export const StoreWishlistUpdateSchema = z.object({
  name: z.string().optional(),
});

export const WishlistItemsListQuerySchema = createFindParams().merge(
  z.object({
    customer_id: z.string().optional(),
    product_id: z.string().optional(),
    product_variant_id: z.string().optional(),
  }),
);

export const WishlistItemCreateSchema = z
  .object({
    items: z.array(WishlistSingleItemSchema).optional(),
    product_id: z.string().optional(),
    product_variant_id: z.string().optional(),
    quantity: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.items && data.items.length > 0) {
      return;
    }

    if (!data.product_variant_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'product_variant_id is required',
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

export const WishlistItemsUpdateSchema = z.object({
  items: z
    .array(
      z
        .object({
          id: z.string().optional(),
          item_id: z.string().optional(),
          quantity: z.number().int().min(0),
        })
        .superRefine((data, ctx) => {
          if (!data.id && !data.item_id) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Either id or item_id is required',
              path: ['id'],
            });
          }
        })
        .transform((data) => ({
          item_id: data.item_id || data.id!,
          quantity: data.quantity,
        })),
    )
    .min(1, 'At least one item must be provided'),
});

export const WishlistAddToCartBodySchema = z.object({
  cart_id: z.string().optional(),
});

export const WishlistItemAddToCartBodySchema = WishlistAddToCartBodySchema;

export type StoreWishlistListQuery = z.infer<typeof StoreWishlistListQuerySchema>;
export type StoreWishlistRetrieveQuery = z.infer<typeof StoreWishlistRetrieveQuerySchema>;
export type StoreWishlistCreateBody = z.infer<typeof StoreWishlistCreateSchema>;
export type StoreWishlistUpdateBody = z.infer<typeof StoreWishlistUpdateSchema>;
export type WishlistItemsListQuery = z.infer<typeof WishlistItemsListQuerySchema>;

export const WishlistItemAddToWishlistSchema = z
  .object({
    wishlist_id: z.string().min(1, 'wishlist_id is required and cannot be empty'),
    customer_id: z.string().optional(),
    name: z.string().optional(),
    items: z.array(WishlistSingleItemSchema).optional(),
    product_id: z.string().optional(),
    product_variant_id: z.string().optional(),
    quantity: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.wishlist_id || data.wishlist_id.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'wishlist_id is required and cannot be empty',
        path: ['wishlist_id'],
      });
    }

    if (data.items && data.items.length > 0) {
      return;
    }

    if (!data.product_variant_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'product_variant_id is required',
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

export type WishlistItemCreateBody = z.infer<typeof WishlistItemCreateSchema>;
export type WishlistItemsUpdateBody = z.infer<typeof WishlistItemsUpdateSchema>;
export type WishlistItemAddToWishlistBody = z.infer<typeof WishlistItemAddToWishlistSchema>;
export type WishlistAddToCartBody = z.infer<typeof WishlistAddToCartBodySchema>;
export type WishlistItemAddToCartBody = z.infer<typeof WishlistItemAddToCartBodySchema>;
