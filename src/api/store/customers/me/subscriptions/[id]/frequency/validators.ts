import { createFindParams, createSelectParams } from '@medusajs/medusa/api/utils/validators';
import { z } from 'zod';

export const selectParams = createSelectParams();
export const findParams = createFindParams();

export const UpdateSubscriptionFrequency = z.object({
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
});

export type UpdateSubscriptionFrequency = z.infer<typeof UpdateSubscriptionFrequency>;
