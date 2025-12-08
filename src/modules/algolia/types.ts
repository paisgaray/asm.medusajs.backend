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
  }[];
  sku: string;
  tags: string[];
  regional_tags: string[];
  collections: string[];
  prices_by_region: Record<string, number>;
  price: number;
  created_at: number;
  popularity: number;
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
  variants?: {
    id?: string;
    title?: string;
    sku?: string;
    sales_count?: number;
    calculated_price?: {
      calculated_amount?: number;
      currency_code?: string;
      [key: string]: unknown;
    };
    prices?: Array<{
      amount?: number;
      currency_code?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }[];
  tags?: (
    | string
    | {
        value?: string;
        name?: string;
        [key: string]: unknown;
      }
  )[];
  collections?: (
    | string
    | {
        id?: string;
        [key: string]: unknown;
      }
  )[];
  prices_by_region?: Record<string, number>;
  [key: string]: unknown;
};

export type AlgoliaSearchHit = AlgoliaProduct & {
  _highlightResult?: Record<string, unknown>;
  _snippetResult?: Record<string, unknown>;
  _rankingInfo?: Record<string, unknown>;
};

export type AlgoliaSearchResponse = {
  results: {
    hits: AlgoliaSearchHit[];
    nbHits: number;
    page: number;
    nbPages: number;
    hitsPerPage: number;
    [key: string]: unknown;
  }[];
};
