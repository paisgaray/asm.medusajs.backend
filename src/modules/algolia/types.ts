export type AlgoliaCollection = {
  id: string;
  handle: string;
  title: string;
};

export type AlgoliaImage = {
  id: string;
  url: string;
};

export type AlgoliaTag = {
  id: string;
  value: string;
};

export type AlgoliaProduct = {
  objectID: string;
  title: string;
  description: string;
  handle: string;
  thumbnail: string;
  language: string;
  variants: {
    id: string;
    title: string;
    sku: string;
    calculated_price?: {
      calculated_amount: number;
      currency_code: string;
    } | null;
  }[];
  sku: string;
  tags: AlgoliaTag[];
  regional_tags: string[];
  collections: string[];
  collections_full: AlgoliaCollection[];
  images: AlgoliaImage[];
  prices_by_region: Record<string, number>;
  price: number;
  created_at: number;
  popularity: number;
};

export type AlgoliaHighlightResult = {
  value: string;
  matchLevel: 'none' | 'partial' | 'full';
  fullyHighlighted?: boolean;
  matchedWords: string[];
};

export type AlgoliaSnippetResult = {
  value: string;
  matchLevel: 'none' | 'partial' | 'full';
};

export type AlgoliaRankingInfo = {
  nbTypos: number;
  firstMatchedWord: number;
  proximityDistance?: number;
  userScore: number;
  geoDistance?: number;
  geoPrecision?: number;
  nbExactWords: number;
  words: number;
  filters: number;
};

export type AlgoliaSearchHit = AlgoliaProduct & {
  _highlightResult?: {
    title?: AlgoliaHighlightResult;
    description?: AlgoliaHighlightResult;
    handle?: AlgoliaHighlightResult;
    [key: string]: AlgoliaHighlightResult | undefined;
  };
  _snippetResult?: {
    title?: AlgoliaSnippetResult;
    description?: AlgoliaSnippetResult;
    [key: string]: AlgoliaSnippetResult | undefined;
  };
  _rankingInfo?: AlgoliaRankingInfo;
};

export type AlgoliaSearchResult = {
  hits: AlgoliaSearchHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS?: number;
  query?: string;
  params?: string;
  exhaustiveNbHits?: boolean;
  exhaustiveTypo?: boolean;
  index?: string;
  queryID?: string;
};

export type AlgoliaSearchResponse = {
  results: AlgoliaSearchResult[];
};

export type AlgoliaRecentSearch = {
  search: string;
  timestamp: number;
  nbHits: number;
};

export type AlgoliaRecentSearchesResponse = {
  searches: AlgoliaRecentSearch[];
  total: number;
  indexName: string;
  language?: string;
};

export type ProductVariantPrice = {
  amount?: number;
  currency_code?: string;
};

export type ProductVariantCalculatedPrice = {
  calculated_amount?: number;
  currency_code?: string;
};

export type ProductVariant = {
  id?: string;
  title?: string;
  sku?: string;
  sales_count?: number;
  calculated_price?: ProductVariantCalculatedPrice;
  prices?: ProductVariantPrice[];
};

export type ProductTag = {
  id?: string;
  value?: string;
  name?: string;
};

export type ProductImage = {
  id?: string;
  url?: string;
};

export type ProductCollection = {
  id?: string;
  handle?: string | null;
  title?: string | null;
};

export type SalesChannelMetadata = Record<string, string | number | boolean | null>;

export type SalesChannel = {
  id?: string;
  name?: string;
  metadata?: SalesChannelMetadata;
};

export type ProductInput = {
  id: string;
  title?: string | null;
  description?: string | null;
  handle?: string | null;
  thumbnail?: string | null;
  collection_id?: string | null;
  created_at?: Date | string | number;
  metadata?: Record<string, string | number | boolean | null>;
  variants?: ProductVariant[];
  tags?: (string | ProductTag)[];
  images?: ProductImage[];
  collections?: (string | ProductCollection)[];
  sales_channels?: SalesChannel[];
  prices_by_region?: Record<string, number>;
};

export type AlgoliaSearchRequest = {
  requests: Array<{
    indexName: string;
    query: string;
    page?: number;
    hitsPerPage?: number;
    filters?: string;
    attributesToRetrieve?: string[];
    [key: string]: string | number | string[] | undefined;
  }>;
};

export type AlgoliaError = {
  message: string;
  status?: number;
  name?: string;
  stack?: string;
};
