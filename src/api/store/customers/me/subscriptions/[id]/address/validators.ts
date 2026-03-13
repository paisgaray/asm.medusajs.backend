import { createFindParams, createSelectParams } from '@medusajs/medusa/api/utils/validators';
import { z } from 'zod';

export const selectParams = createSelectParams();
export const findParams = createFindParams();

export const UpdateSubscriptionAddress = z.object({
  delivery_date: z.coerce.date(),
  period: z.enum(['morning', 'afternoon', 'evening']),
  first_name: z.string(),
  last_name: z.string(),
  address_1: z.string(),
  address_2: z.string(),
  city: z.string(),
  country_code: z.string(),
  postal_code: z.string(),
});

export type UpdateSubscriptionAddress = z.infer<typeof UpdateSubscriptionAddress>;
