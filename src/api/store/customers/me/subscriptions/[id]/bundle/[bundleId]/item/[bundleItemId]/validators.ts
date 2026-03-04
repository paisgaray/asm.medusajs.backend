import { createFindParams, createSelectParams } from '@medusajs/medusa/api/utils/validators';
import { z } from 'zod';

export const selectParams = createSelectParams();
export const findParams = createFindParams();

export const UpdateCustomItemSchema = z.object({
  applyToAllShipments: z.boolean().default(false),
  item: z.object({
    bundleItemId: z.string(),
    product_id: z.string(),
  }),
});

export type UpdateCustomItemSchema = z.infer<typeof UpdateCustomItemSchema>;
