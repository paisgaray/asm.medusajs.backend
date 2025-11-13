import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework';
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import { MiddlewareRoute } from '@medusajs/medusa';

import { WISHLIST_MODULE } from '../../../modules/wishlist';
import WishlistService from '../../../modules/wishlist/service';
import {
  StoreWishlistCreateSchema,
  StoreWishlistListQuerySchema,
  StoreWishlistRetrieveQuerySchema,
  WishlistAddToCartBodySchema,
  WishlistBundleAddToCartBodySchema,
  WishlistItemCreateSchema,
  WishlistItemsListQuerySchema,
  type StoreWishlistRetrieveQuery,
} from './validators';

const wishlistListQueryConfig = {
  defaults: ['id', 'customer_id', 'share_token'],
  defaultLimit: 20,
  isList: true,
};

const wishlistRetrieveQueryConfig = {
  defaults: ['id', 'customer_id', 'share_token'],
};

const wishlistItemsListQueryConfig = {
  defaults: ['id', 'wishlist_id', 'product_id', 'product_variant_id', 'bundle_id', 'quantity'],
  defaultLimit: 50,
  isList: true,
};

async function ensureWishlistOwnership(req: MedusaRequest, _res: MedusaResponse, next: () => void): Promise<void> {
  const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
  const wishlistId = req.params.id as string;
  const query = req.filterableFields as StoreWishlistRetrieveQuery;
  const customerId = query?.customer_id;

  if (!customerId) {
    next();
    return;
  }

  const wishlist = await wishlistService.retrieveWishlist(wishlistId);

  if (wishlist.customer_id !== customerId) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'Access denied');
  }

  next();
}

async function ensureWishlistItemOwnership(req: MedusaRequest, _res: MedusaResponse, next: () => void): Promise<void> {
  const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE);
  const wishlistId = req.params.id as string;
  const itemId = req.params.itemId as string;
  const query = req.filterableFields as StoreWishlistRetrieveQuery;
  const customerId = query?.customer_id;

  const item = await wishlistService.retrieveWishlistItem(itemId);

  if (item.wishlist_id !== wishlistId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Item not found in this wishlist');
  }

  if (customerId) {
    const wishlist = await wishlistService.retrieveWishlist(item.wishlist_id);
    if (wishlist.customer_id !== customerId) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'Access denied');
    }
  }

  next();
}

export const wishlistMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/store/wishlist',
    methods: ['GET'],
    middlewares: [validateAndTransformQuery(StoreWishlistListQuerySchema, wishlistListQueryConfig)],
  },
  {
    matcher: '/store/wishlist',
    methods: ['POST'],
    middlewares: [validateAndTransformBody(StoreWishlistCreateSchema)],
  },
  {
    matcher: '/store/wishlist/:id',
    methods: ['GET', 'DELETE'],
    middlewares: [
      validateAndTransformQuery(StoreWishlistRetrieveQuerySchema, wishlistRetrieveQueryConfig),
      ensureWishlistOwnership,
    ],
  },
  {
    matcher: '/store/wishlist/:id',
    methods: ['POST'],
    middlewares: [
      validateAndTransformQuery(StoreWishlistRetrieveQuerySchema, wishlistRetrieveQueryConfig),
      ensureWishlistOwnership,
    ],
  },
  {
    matcher: '/store/wishlist/:id/items',
    methods: ['GET'],
    middlewares: [
      validateAndTransformQuery(WishlistItemsListQuerySchema, wishlistItemsListQueryConfig),
      ensureWishlistOwnership,
    ],
  },
  {
    matcher: '/store/wishlist/:id/items',
    methods: ['POST'],
    middlewares: [
      validateAndTransformQuery(StoreWishlistRetrieveQuerySchema, wishlistRetrieveQueryConfig),
      ensureWishlistOwnership,
      validateAndTransformBody(WishlistItemCreateSchema),
    ],
  },
  {
    matcher: '/store/wishlist/:id/items',
    methods: ['DELETE'],
    middlewares: [
      validateAndTransformQuery(StoreWishlistRetrieveQuerySchema, wishlistRetrieveQueryConfig),
      ensureWishlistOwnership,
    ],
  },
  {
    matcher: '/store/wishlist/:id/items/:itemId',
    methods: ['DELETE'],
    middlewares: [
      validateAndTransformQuery(StoreWishlistRetrieveQuerySchema, wishlistRetrieveQueryConfig),
      ensureWishlistItemOwnership,
    ],
  },
  {
    matcher: '/store/wishlist/:id/count',
    methods: ['GET'],
    middlewares: [
      validateAndTransformQuery(StoreWishlistRetrieveQuerySchema, wishlistRetrieveQueryConfig),
      ensureWishlistOwnership,
    ],
  },
  {
    matcher: '/store/wishlist/:id/share',
    methods: ['POST'],
    middlewares: [
      validateAndTransformQuery(StoreWishlistRetrieveQuerySchema, wishlistRetrieveQueryConfig),
      ensureWishlistOwnership,
    ],
  },
  {
    matcher: '/store/wishlist/:id/add-to-cart',
    methods: ['POST'],
    middlewares: [
      validateAndTransformQuery(StoreWishlistRetrieveQuerySchema, wishlistRetrieveQueryConfig),
      ensureWishlistOwnership,
      validateAndTransformBody(WishlistAddToCartBodySchema),
    ],
  },
  {
    matcher: '/store/wishlist/:id/items/:itemId/add-to-cart',
    methods: ['POST'],
    middlewares: [
      validateAndTransformQuery(StoreWishlistRetrieveQuerySchema, wishlistRetrieveQueryConfig),
      ensureWishlistItemOwnership,
      validateAndTransformBody(WishlistAddToCartBodySchema),
    ],
  },
  {
    matcher: '/store/wishlist/:id/items/:itemId/add-bundle-to-cart',
    methods: ['POST'],
    middlewares: [
      validateAndTransformQuery(StoreWishlistRetrieveQuerySchema, wishlistRetrieveQueryConfig),
      ensureWishlistItemOwnership,
      validateAndTransformBody(WishlistBundleAddToCartBodySchema),
    ],
  },
  {
    matcher: '/store/wishlist/:id/items/:itemId/remove-bundle',
    methods: ['DELETE'],
    middlewares: [
      validateAndTransformQuery(StoreWishlistRetrieveQuerySchema, wishlistRetrieveQueryConfig),
      ensureWishlistItemOwnership,
    ],
  },
  {
    matcher: '/store/wishlist/shared/:token',
    methods: ['GET'],
    middlewares: [validateAndTransformQuery(WishlistItemsListQuerySchema, wishlistItemsListQueryConfig)],
  },
];
