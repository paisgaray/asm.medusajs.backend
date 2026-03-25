import { createFindParams, createSelectParams } from '@medusajs/medusa/api/utils/validators';
import { z } from 'zod';

export const selectParams = createSelectParams();
export const findParams = createFindParams();

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const UpdateSubscriptionAddress = z
  .object({
    delivery_date: z.coerce
      .date()
      .refine((d) => d.getTime() - Date.now() >= SEVEN_DAYS_MS, {
        message: 'Delivery date must be at least 7 days from now',
      })
      .nullish(),
    period: z.enum(['morning', 'afternoon', 'evening']).nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    address_1: z.string().nullish(),
    address_2: z.string().nullish(),
    city: z.string().nullish(),
    country_code: z.string().nullish(),
    postal_code: z.string().nullish(),
  })
  .refine((d) => Object.values(d).some((v) => v != null), {
    message: 'At least one field must be provided',
  });

export type UpdateSubscriptionAddress = z.infer<typeof UpdateSubscriptionAddress>;
