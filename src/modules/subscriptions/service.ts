import { MedusaService } from '@medusajs/framework/utils';

import { Subscription } from './models/subscription';
import { SubscriptionItem } from './models/subscription-item';

export default class SubscriptionModuleService extends MedusaService({
  Subscription,
  SubscriptionItem,
}) {}
