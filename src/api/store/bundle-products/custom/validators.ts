import { createFindParams, createSelectParams } from '@medusajs/medusa/api/utils/validators';
import { z } from 'zod';

export const selectParams = createSelectParams();
export const findParams = createFindParams();

export const CreateCustomBundledProductsSchema = z.object({
  bundle_id: z.string(),
  items: z.array(
    z.object({
      bundleItemId: z.string(),
      product_id: z.string(),
    }),
  ),
});

export type CreateCustomBundledProductsSchema = z.infer<typeof CreateCustomBundledProductsSchema>;
