import { MedusaService } from '@medusajs/framework/utils';

import { Bundle } from './models/bundle';
import { BundleItem } from './models/bundle-item';
import { CustomBundle } from './models/custom-bundle';
import { CustomItem } from './models/custom-item';
import { CustomItemOverride } from './models/custom-item-override';

export default class BundledProductModuleService extends MedusaService({
  Bundle,
  BundleItem,
  CustomBundle,
  CustomItem,
  CustomItemOverride,
}) {}
