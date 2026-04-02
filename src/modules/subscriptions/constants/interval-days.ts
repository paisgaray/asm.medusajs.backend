import { SubscriptionFrequency } from '../types';

export const INTERVAL_DAYS: Record<SubscriptionFrequency, number> = {
  [SubscriptionFrequency.WEEKLY]: 7,
  [SubscriptionFrequency.BIWEEKLY]: 14,
  [SubscriptionFrequency.MONTHLY]: 30,
};
