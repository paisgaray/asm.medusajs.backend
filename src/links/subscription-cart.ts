import { defineLink } from '@medusajs/framework/utils';
import CartModule from '@medusajs/medusa/cart';

import SubscriptionModule from '../modules/subscription';

export default defineLink(SubscriptionModule.linkable.subscription, CartModule.linkable.cart);
