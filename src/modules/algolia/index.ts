import { Module } from '@medusajs/framework/utils';

import AlgoliaModuleService from './service';

export const ALGOLIA_MODULE = 'algolia';

export default Module(ALGOLIA_MODULE, {
  service: AlgoliaModuleService,
});

export type {
  AlgoliaProduct,
  AlgoliaSearchHit,
  AlgoliaSearchResponse,
  AlgoliaSearchRequest,
  AlgoliaRecentSearchesResponse,
  AlgoliaRecentSearch,
  ProductInput,
  SalesChannel,
  SalesChannelMetadata,
} from './types';
