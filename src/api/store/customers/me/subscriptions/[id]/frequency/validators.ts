import { createFindParams, createSelectParams } from '@medusajs/medusa/api/utils/validators';
import { z } from 'zod';

import { SubscriptionFrequency } from '../../../../../../../modules/subscriptions/types';

export const selectParams = createSelectParams();
export const findParams = createFindParams();

const [first, ...other] = Object.values(SubscriptionFrequency);

export const UpdateSubscriptionFrequency = z.object({
  frequency: z.enum([first, ...other]),
});

export type UpdateSubscriptionFrequency = z.infer<typeof UpdateSubscriptionFrequency>;
