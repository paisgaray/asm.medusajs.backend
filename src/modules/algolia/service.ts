import { MedusaError } from '@medusajs/framework/utils';
import { algoliasearch, SearchClient } from 'algoliasearch';

import type {
  AlgoliaProduct,
  AlgoliaSearchRequest,
  AlgoliaSearchResponse,
  AlgoliaRecentSearchesResponse,
  AlgoliaRecentSearch,
  ProductInput,
  ProductCollection,
  ProductTag,
  AlgoliaError,
  SalesChannel,
  SalesChannelMetadata,
} from './types';

type AlgoliaOptions = {
  apiKey: string;
  appId: string;
  productIndexName: string;
  regionalTagPrefixes?: string[];
  supportedLanguages?: string[];
};

export type AlgoliaIndexType = 'product';

const COMMON_SUFFIXES = ['BR', '001', '002', '003', '01', '02', '03', '1121', '00x'];

type Container = Record<string, never>;

type AlgoliaLogEntry = {
  timestamp: string;
  method: string;
  answer_code: string | number;
  query_body: string;
  answer: string;
  url: string;
  ip: string;
  query_headers: string;
  sha1: string;
  index_name?: string;
  query_params?: string;
  [key: string]: unknown;
};

export default class AlgoliaModuleService {
  private client: SearchClient;
  private options: AlgoliaOptions;

  constructor(_container: Container, options: AlgoliaOptions) {
    if (!options.appId || !options.apiKey || !options.productIndexName) {
      const missing = [];
      if (!options.appId) missing.push('ALGOLIA_APP_ID');
      if (!options.apiKey) missing.push('ALGOLIA_API_KEY');
      if (!options.productIndexName) missing.push('ALGOLIA_PRODUCT_INDEX_NAME');
      throw new Error(
        `Algolia configuration is incomplete. Missing environment variables: ${missing.join(', ')}. Please check your .env file.`,
      );
    }

    const appId = options.appId.trim();
    const apiKey = options.apiKey.trim();

    if (!appId || !apiKey) {
      throw new Error(
        'Algolia credentials are empty after trimming. Please check ALGOLIA_APP_ID and ALGOLIA_API_KEY in your .env file.',
      );
    }

    try {
      this.client = algoliasearch(appId, apiKey);
      this.options = {
        ...options,
        appId,
        apiKey,
        productIndexName: options.productIndexName.trim(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initialize Algolia client: ${errorMessage}`);
    }
  }

  getSupportedLanguages(): string[] {
    return this.options.supportedLanguages || ['es'];
  }

  isLanguageSupported(language: string): boolean {
    return this.getSupportedLanguages().includes(language.toLowerCase());
  }

  validateLanguage(language?: string): string {
    if (!language) return 'es';
    const normalized = language.toLowerCase();
    return this.isLanguageSupported(normalized) ? normalized : 'es';
  }

  mapRegionalTagToLanguage(regionalTag: string): string {
    if (!regionalTag || typeof regionalTag !== 'string') return 'pt';

    const tag = regionalTag.trim().toLowerCase();
    const match = tag.match(/^([a-z]{2,3})(?:[-_]|$)/);

    if (match?.[1] && this.isLanguageSupported(match[1])) {
      return match[1];
    }

    if (tag.length >= 2) {
      const twoLetter = tag.substring(0, 2);
      if (this.isLanguageSupported(twoLetter)) {
        return twoLetter;
      }
    }

    return 'pt';
  }

  extractLanguageFromRegionalTags(regionalTags: string[]): string {
    if (!regionalTags?.length) return 'pt';

    for (const tag of regionalTags) {
      const lang = this.mapRegionalTagToLanguage(tag);
      if (lang !== 'pt' || tag.toLowerCase().startsWith('pt')) {
        return lang;
      }
    }

    return regionalTags.length > 0 ? this.mapRegionalTagToLanguage(regionalTags[0]) : 'pt';
  }

  async getIndexName(type: AlgoliaIndexType = 'product', language?: string): Promise<string> {
    switch (type) {
      case 'product': {
        const base = this.options.productIndexName;
        if (language && language !== 'es') {
          return `${base}_${language}`;
        }
        return base;
      }
      default:
        throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, `Invalid index type: ${type}`);
    }
  }

  async deleteFromIndex(objectIDs: string[], language?: string): Promise<void> {
    if (!objectIDs?.length) return;
    const indexName = await this.getIndexName('product', language);
    await this.client.deleteObjects({ indexName, objectIDs });
  }

  async clearIndex(language?: string): Promise<void> {
    const indexName = await this.getIndexName('product', language);
    const appId = this.options.appId;
    const apiKey = this.options.apiKey;
    const url = `https://${appId}.algolia.net/1/indexes/${encodeURIComponent(indexName)}/clear`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Algolia-Application-Id': appId,
          'X-Algolia-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Algolia API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      const algoliaError = this.normalizeError(error);
      const errorMessage = algoliaError.message.toLowerCase();
      const isBlocked =
        errorMessage.includes('blocked') ||
        errorMessage.includes('cannot be processed') ||
        errorMessage.includes('contact us to unblock') ||
        errorMessage.includes('contact algolia support');

      if (isBlocked) {
        return;
      }

      throw new Error(`Failed to clear Algolia index '${indexName}': ${algoliaError.message}`);
    }
  }

  private buildRegionalTagFilters(lang: string): string[] {
    const lower = lang.toLowerCase();
    const filters = [`regional_tags:${lower}`];

    for (const suffix of COMMON_SUFFIXES) {
      filters.push(`regional_tags:${lower}-${suffix}`);
    }

    return filters;
  }

  private buildFilterString(filters: string[], regionalFilters: string[]): string {
    const parts: string[] = [];
    if (filters.length > 0) parts.push(...filters);
    if (regionalFilters.length > 0) {
      parts.push(`(${regionalFilters.join(' OR ')})`);
    }
    return parts.length > 0 ? parts.join(' AND ') : '';
  }

  private createSearchRequest(
    indexName: string,
    query: string,
    page: number,
    hitsPerPage: number,
    filterString?: string,
    _sortBy?: string,
  ): AlgoliaSearchRequest {
    const request: AlgoliaSearchRequest['requests'][number] = {
      indexName,
      query: query || '',
      page,
      hitsPerPage,
    };

    if (filterString && filterString.trim()) {
      request.filters = filterString;
    }

    return { requests: [request] };
  }

  async searchProducts(
    query: string,
    filters = '',
    page = 0,
    hitsPerPage = 20,
    sortBy?: string,
    language?: string,
  ): Promise<AlgoliaSearchResponse> {
    const baseIndex = await this.getIndexName('product', language);

    // Try to use replica index for sorting if sortBy is provided
    // If replica doesn't exist, fallback to base index
    let indexName = baseIndex;
    let shouldTryReplica = false;

    if (sortBy) {
      indexName = `${baseIndex}_${sortBy}`;
      shouldTryReplica = true;
    }

    const filterParts = filters ? [filters] : [];
    const regionalFilters = language ? this.buildRegionalTagFilters(language) : [];
    const filterString = this.buildFilterString(filterParts, regionalFilters);

    const searchRequest = this.createSearchRequest(indexName, query || '', page, hitsPerPage, filterString);

    try {
      return (await this.client.search(searchRequest)) as AlgoliaSearchResponse;
    } catch (error) {
      const algoliaError = this.normalizeError(error);
      const errorMessage = algoliaError.message.toLowerCase();

      const errorName = algoliaError.name?.toLowerCase() || '';
      const isNetworkError =
        errorMessage.includes('unreachable hosts') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('eai_again') ||
        errorName.includes('retry') ||
        errorName.includes('network') ||
        errorName.includes('timeout') ||
        errorName.includes('aborterror');

      if (isNetworkError) {
        const isUnreachableHosts = errorMessage.includes('unreachable hosts');
        const errorDetails = isUnreachableHosts
          ? 'Cannot connect to Algolia servers. Please check ALGOLIA_APP_ID and ALGOLIA_API_KEY in your .env file, and verify your network connection.'
          : 'Network error while connecting to Algolia. Please try again later.';

        throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Algolia search failed: ${errorDetails}`);
      }

      const isIndexError =
        errorMessage.includes('does not exist') ||
        errorMessage.includes('index not found') ||
        errorMessage.includes('invalid index name');

      // If replica index doesn't exist and we have sortBy, fallback to base index
      if (isIndexError && shouldTryReplica) {
        try {
          const fallbackRequest = this.createSearchRequest(baseIndex, query || '', page, hitsPerPage, filterString);
          return (await this.client.search(fallbackRequest)) as AlgoliaSearchResponse;
        } catch {
          return {
            results: [
              {
                hits: [],
                nbHits: 0,
                page: 0,
                nbPages: 0,
                hitsPerPage,
              },
            ],
          } as AlgoliaSearchResponse;
        }
      }

      if (isIndexError) {
        return {
          results: [
            {
              hits: [],
              nbHits: 0,
              page: 0,
              nbPages: 0,
              hitsPerPage,
            },
          ],
        } as AlgoliaSearchResponse;
      }

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Algolia search failed: ${algoliaError.message || 'Unknown error'}`,
      );
    }
  }

  async search(query: string, type: AlgoliaIndexType = 'product'): Promise<AlgoliaSearchResponse> {
    const indexName = await this.getIndexName(type);

    try {
      return (await this.client.search({
        requests: [
          {
            indexName,
            query: query || '',
          },
        ],
      })) as AlgoliaSearchResponse;
    } catch (error: unknown) {
      const algoliaError = this.normalizeError(error);
      const errorMessage = algoliaError.message.toLowerCase();
      const errorName = algoliaError.name?.toLowerCase() || '';

      const isNetworkError =
        errorMessage.includes('unreachable hosts') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('eai_again') ||
        errorName.includes('retry') ||
        errorName.includes('network') ||
        errorName.includes('timeout') ||
        errorName.includes('aborterror');

      if (isNetworkError) {
        const isUnreachableHosts = errorMessage.includes('unreachable hosts');
        const errorDetails = isUnreachableHosts
          ? 'Cannot connect to Algolia servers. Please check ALGOLIA_APP_ID and ALGOLIA_API_KEY in your .env file, and verify your network connection.'
          : 'Network error while connecting to Algolia. Please try again later.';

        throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Algolia search failed: ${errorDetails}`);
      }

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Algolia search failed: ${algoliaError.message || 'Unknown error'}`,
      );
    }
  }

  async autocomplete(query: string, hitsPerPage = 5, filters = '', language?: string): Promise<AlgoliaSearchResponse> {
    const indexName = await this.getIndexName('product', language);
    const filterParts = filters ? [filters] : [];
    const regionalFilters: string[] = [];
    const filterString = this.buildFilterString(filterParts, regionalFilters);

    const searchRequest = this.createSearchRequest(indexName, query || '', 0, hitsPerPage, filterString);

    try {
      return (await this.client.search(searchRequest)) as AlgoliaSearchResponse;
    } catch (error) {
      const algoliaError = this.normalizeError(error);
      const errorMessage = algoliaError.message.toLowerCase();

      const errorName = algoliaError.name?.toLowerCase() || '';
      const isNetworkError =
        errorMessage.includes('unreachable hosts') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('eai_again') ||
        errorName.includes('retry') ||
        errorName.includes('network') ||
        errorName.includes('timeout') ||
        errorName.includes('aborterror');

      if (isNetworkError) {
        const isUnreachableHosts = errorMessage.includes('unreachable hosts');
        const errorDetails = isUnreachableHosts
          ? 'Cannot connect to Algolia servers. Please check ALGOLIA_APP_ID and ALGOLIA_API_KEY in your .env file, and verify your network connection.'
          : 'Network error while connecting to Algolia. Please try again later.';

        throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Algolia autocomplete failed: ${errorDetails}`);
      }

      const isIndexError =
        errorMessage.includes('does not exist') ||
        errorMessage.includes('index not found') ||
        errorMessage.includes('invalid index name');

      if (isIndexError) {
        return {
          results: [
            {
              hits: [],
              nbHits: 0,
              page: 0,
              nbPages: 0,
              hitsPerPage,
            },
          ],
        } as AlgoliaSearchResponse;
      }

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Algolia autocomplete failed: ${algoliaError.message || 'Unknown error'}`,
      );
    }
  }

  private extractQueryFromLog(log: AlgoliaLogEntry): string | null {
    if (log.method !== 'POST' && log.method !== 'GET') return null;

    try {
      if (log.query_body) {
        const body = JSON.parse(log.query_body) as { query?: string; requests?: Array<{ query?: string }> };
        if (body.query) return body.query;
        if (body.requests && body.requests.length > 0 && body.requests[0].query) {
          return body.requests[0].query;
        }
      }

      if (log.query_params) {
        const params = new URLSearchParams(log.query_params);
        const query = params.get('query');
        if (query) return query;
      }

      if (log.url && log.url.includes('query=')) {
        const urlParams = new URLSearchParams(log.url.split('?')[1]);
        const query = urlParams.get('query');
        if (query) return decodeURIComponent(query);
      }
    } catch {
      return null;
    }

    return null;
  }

  async getRecentSearches(language?: string, limit: number = 5): Promise<AlgoliaRecentSearchesResponse> {
    const indexName = await this.getIndexName('product', language);

    try {
      const client = this.client as SearchClient & {
        getLogs?: (params?: { offset?: number; length?: number; type?: string }) => Promise<{
          logs: AlgoliaLogEntry[];
        }>;
      };

      if (typeof client.getLogs === 'function') {
        const logsResponse = await client.getLogs({
          offset: 0,
          length: limit * 20,
          type: 'query',
        });

        const logs = (logsResponse.logs || []) as unknown as AlgoliaLogEntry[];
        const searchQueries = new Map<string, AlgoliaRecentSearch>();

        for (const log of logs) {
          const logIndexName = (log as Record<string, unknown>).index_name as string | undefined;
          if (logIndexName && logIndexName !== indexName) continue;

          const query = this.extractQueryFromLog(log);
          if (!query || query.trim().length === 0) continue;

          const queryLower = query.trim().toLowerCase();
          if (!searchQueries.has(queryLower)) {
            try {
              const answer = JSON.parse(log.answer) as { nbHits?: number };
              let timestamp: number;
              if (typeof log.timestamp === 'string') {
                const parsed = Number.parseInt(log.timestamp, 10);
                timestamp = Number.isNaN(parsed) ? Date.now() : parsed;
              } else if (typeof log.timestamp === 'number') {
                timestamp = log.timestamp;
              } else {
                timestamp = Date.now();
              }
              searchQueries.set(queryLower, {
                search: query.trim(),
                timestamp,
                nbHits: answer.nbHits || 0,
              });
            } catch {
              let timestamp: number;
              if (typeof log.timestamp === 'string') {
                const parsed = Number.parseInt(log.timestamp, 10);
                timestamp = Number.isNaN(parsed) ? Date.now() : parsed;
              } else if (typeof log.timestamp === 'number') {
                timestamp = log.timestamp;
              } else {
                timestamp = Date.now();
              }
              searchQueries.set(queryLower, {
                search: query.trim(),
                timestamp,
                nbHits: 0,
              });
            }
          }
        }

        const recentSearches: AlgoliaRecentSearch[] = Array.from(searchQueries.values())
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);

        return {
          searches: recentSearches,
          total: recentSearches.length,
          indexName,
          language,
        };
      }

      return {
        searches: [],
        total: 0,
        indexName,
        language,
      };
    } catch (error) {
      const algoliaError = this.normalizeError(error);
      throw new Error(`Failed to get recent searches: ${algoliaError.message}`);
    }
  }

  private normalizeError(error: unknown): AlgoliaError {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }

    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return {
        message: error.message,
        status: 'status' in error && typeof error.status === 'number' ? error.status : undefined,
      };
    }

    return {
      message: 'Unknown error',
    };
  }

  private extractTagsFromMetadata(metadata: SalesChannelMetadata): string[] {
    const tags: string[] = [];
    const regionalTags = metadata.regional_tags;

    if (Array.isArray(regionalTags)) {
      regionalTags.forEach((tag) => {
        if (typeof tag === 'string' && tag.trim()) {
          tags.push(tag.trim());
        }
      });
    } else if (typeof regionalTags === 'string') {
      regionalTags.split(',').forEach((tag) => {
        const trimmed = tag.trim();
        if (trimmed) tags.push(trimmed);
      });
    }

    return tags;
  }

  private getRegionalTagsFromSalesChannels(salesChannels?: SalesChannel[]): string[] {
    if (!salesChannels?.length) return [];

    const tags = new Set<string>();

    for (const sc of salesChannels) {
      if (sc.metadata) {
        this.extractTagsFromMetadata(sc.metadata).forEach((tag) => tags.add(tag));
      }
      if (sc.metadata?.regional_tags) {
        this.extractTagsFromMetadata({ regional_tags: sc.metadata.regional_tags }).forEach((tag) => tags.add(tag));
      }
    }

    return Array.from(tags);
  }

  private getRegionalTags(tagValues: string[]): string[] {
    const prefixes = this.options.regionalTagPrefixes || [];

    if (prefixes.length > 0) {
      return tagValues.filter((t) => {
        const lower = t.toLowerCase();
        return prefixes.some((p) => lower.startsWith(p.toLowerCase()));
      });
    }

    return tagValues.filter((t) => {
      const lower = t.toLowerCase();
      return (lower.includes('-') || lower.includes('_')) && /^[a-z]{2,3}[-_]/.test(lower);
    });
  }

  private getProductPrice(product: ProductInput): number {
    const allPrices: number[] = [];

    if (product.variants && Array.isArray(product.variants)) {
      for (const variant of product.variants) {
        if (variant.calculated_price?.calculated_amount != null && variant.calculated_price.calculated_amount > 0) {
          allPrices.push(variant.calculated_price.calculated_amount);
        }
      }
    }

    const pricesByRegion = product.prices_by_region || {};
    if (Object.keys(pricesByRegion).length > 0) {
      const regionalPrices = Object.values(pricesByRegion).filter((p) => typeof p === 'number' && p > 0);
      allPrices.push(...regionalPrices);
    }

    if (allPrices.length > 0) {
      return Math.min(...allPrices);
    }

    const firstVariant = product.variants?.[0];
    if (firstVariant && Array.isArray(firstVariant.prices) && firstVariant.prices.length > 0) {
      return firstVariant.prices[0].amount || 0;
    }

    return 0;
  }

  private getCreatedAtIndex(createdAt?: Date | string | number): number {
    if (!createdAt) return Date.now();
    if (typeof createdAt === 'number') return createdAt;
    if (typeof createdAt === 'string') {
      const date = new Date(createdAt);
      return isNaN(date.getTime()) ? Date.now() : date.getTime();
    }
    return createdAt.getTime();
  }

  transformProductForIndexing(product: ProductInput, language: string = 'pt'): AlgoliaProduct {
    const metadata = product.metadata || {};
    let title = product.title || '';
    let description = product.description || '';
    let handle = product.handle || '';

    if (language !== 'pt') {
      const titleKey = `title_${language}`;
      const descKey = `description_${language}`;
      const handleKey = `handle_${language}`;

      if (typeof metadata[titleKey] === 'string') title = metadata[titleKey];
      if (typeof metadata[descKey] === 'string') description = metadata[descKey];
      if (typeof metadata[handleKey] === 'string') handle = metadata[handleKey];
    }

    const tagsFormatted: Array<{ id: string; value: string }> = [];
    if (product.tags !== undefined && product.tags !== null) {
      if (Array.isArray(product.tags)) {
        for (const tag of product.tags) {
          if (typeof tag === 'string' && tag.trim()) {
            tagsFormatted.push({ id: '', value: tag.trim() });
          } else if (tag && typeof tag === 'object') {
            const tagObj = tag as ProductTag;
            const tagId = tagObj.id || '';
            const tagValue = tagObj.value || tagObj.name || '';
            if (tagValue && String(tagValue).trim()) {
              tagsFormatted.push({ id: String(tagId), value: String(tagValue).trim() });
            }
          }
        }
      } else {
        const tagsString = product.tags as string;
        if (typeof tagsString === 'string' && tagsString.trim()) {
          tagsFormatted.push({ id: '', value: tagsString.trim() });
        }
      }
    }

    const tagValues = tagsFormatted.map((t) => t.value);

    const collectionIds: string[] = [];
    const collectionsFull: Array<{ id: string; handle: string; title: string }> = [];

    const collection = (product as { collection?: ProductCollection }).collection;
    if (collection?.id) {
      collectionIds.push(collection.id);
      const handle = collection.handle || '';
      const title = collection.title || '';
      if (handle && title) {
        collectionsFull.push({
          id: collection.id,
          handle: String(handle),
          title: String(title),
        });
      }
    }

    if (product.collection_id && !collectionIds.includes(product.collection_id)) {
      collectionIds.push(product.collection_id);
    }

    if (Array.isArray(product.collections)) {
      for (const col of product.collections) {
        const colId = typeof col === 'string' ? col : col.id;
        if (colId && !collectionIds.includes(colId)) {
          collectionIds.push(colId);
        }
        if (typeof col === 'object' && col.id && col.handle && col.title) {
          collectionsFull.push({
            id: col.id,
            handle: col.handle || '',
            title: col.title || '',
          });
        }
      }
    }

    const regionalTagsFromSC = this.getRegionalTagsFromSalesChannels(product.sales_channels);
    const regionalTagsFromProduct = this.getRegionalTags(tagValues);
    let regionalTags = regionalTagsFromSC.length > 0 ? regionalTagsFromSC : regionalTagsFromProduct;

    if (!regionalTags || regionalTags.length === 0) {
      const defaultTag = `${language}-001`;
      regionalTags = [defaultTag, language];
    }

    if (!Array.isArray(regionalTags)) {
      regionalTags = [String(regionalTags)];
    }

    const images: Array<{ id: string; url: string }> = [];
    if (Array.isArray(product.images)) {
      for (const img of product.images) {
        if (img && typeof img === 'object') {
          const imgObj = img as { id?: string; url?: string };
          const imgId = imgObj.id || '';
          const imgUrl = imgObj.url || '';
          if (imgId && imgUrl) {
            images.push({ id: String(imgId), url: String(imgUrl) });
          }
        }
      }
    }

    return {
      objectID: product.id,
      title,
      description,
      handle,
      thumbnail: product.thumbnail || '',
      language,
      variants: Array.isArray(product.variants)
        ? product.variants.map((v) => ({
            id: v.id || '',
            title: v.title || '',
            sku: v.sku || '',
            calculated_price: v.calculated_price
              ? {
                  calculated_amount: v.calculated_price.calculated_amount || 0,
                  currency_code: v.calculated_price.currency_code || 'USD',
                }
              : null,
          }))
        : [],
      sku: product.variants?.[0]?.sku || '',
      tags: tagsFormatted,
      regional_tags: regionalTags,
      collections: [...new Set(collectionIds)],
      collections_full: collectionsFull,
      images,
      prices_by_region: product.prices_by_region || {},
      price: this.getProductPrice(product),
      created_at: this.getCreatedAtIndex(product.created_at),
      popularity: product.variants?.[0]?.sales_count || 0,
    };
  }

  private async indexProductsViaREST(
    objects: AlgoliaProduct[],
    indexName: string,
    appId: string,
    apiKey: string,
  ): Promise<void> {
    const url = `https://${appId}.algolia.net/1/indexes/${encodeURIComponent(indexName)}/batch`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Algolia-Application-Id': appId,
          'X-Algolia-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: objects.map((obj) => ({
            action: 'addObject',
            body: obj,
          })),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Algolia REST API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `REST fallback timeout: Unable to connect to Algolia. This is likely a DNS/network issue in WSL. Please check your network configuration.`,
        );
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to index via REST fallback: ${errorMessage}`);
    }
  }

  async indexData(data: ProductInput[], type: AlgoliaIndexType = 'product', language?: string): Promise<void> {
    if (!data?.length) return;

    const indexName = await this.getIndexName(type, language);
    const validatedLanguage = language || 'pt';

    const objects = data.map((item) => {
      const transformed = this.transformProductForIndexing(item, validatedLanguage);
      return {
        ...transformed,
        objectID: item.id,
      };
    });

    try {
      await this.client.saveObjects({
        indexName,
        objects,
      });
    } catch (error: unknown) {
      const algoliaError = this.normalizeError(error);
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to index data in Algolia: ${algoliaError.message || 'Unknown error'}`,
      );
    }
  }

  async indexProducts(products: ProductInput[], language: string = 'pt', indexNameOverride?: string): Promise<void> {
    if (!products?.length) return;

    const validatedLanguage = this.validateLanguage(language);
    const indexName = indexNameOverride || (await this.getIndexName('product', validatedLanguage));
    const transformed = products.map((p) => this.transformProductForIndexing(p, validatedLanguage));
    const appId = this.options.appId.trim();
    const apiKey = this.options.apiKey.trim();

    const batchSize = 100;
    const delayBetweenBatches = 1000;
    const totalBatches = Math.ceil(transformed.length / batchSize);

    for (let i = 0; i < transformed.length; i += batchSize) {
      const batch = transformed.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      try {
        await this.client.saveObjects({ indexName, objects: batch });

        if (i + batchSize < transformed.length) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
        }
      } catch (error) {
        const algoliaError = this.normalizeError(error);
        const errorMessage = algoliaError.message.toLowerCase();
        const errorName = algoliaError.name?.toLowerCase() || '';

        const isBlocked =
          errorMessage.includes('blocked') ||
          errorMessage.includes('cannot be processed') ||
          errorMessage.includes('contact us to unblock') ||
          errorMessage.includes('contact algolia support');

        if (isBlocked) {
          throw new Error(
            `Algolia application is blocked. Cannot index products. Please contact Algolia support to unblock your application. Original error: ${algoliaError.message}`,
          );
        }

        const isNetworkError =
          errorMessage.includes('unreachable hosts') ||
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('network') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('eai_again') ||
          errorMessage.includes('retryerror') ||
          errorName.includes('retry') ||
          errorName.includes('network') ||
          errorName.includes('timeout');

        if (isNetworkError) {
          try {
            await this.indexProductsViaREST(batch, indexName, appId, apiKey);
            if (i + batchSize < transformed.length) {
              await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
            }
            continue;
          } catch (restError) {
            const restErrorMessage = restError instanceof Error ? restError.message : 'Unknown error';
            throw new Error(
              `Failed to index products via SDK and REST fallback. Network issue detected. Please check DNS/network configuration. SDK error: ${algoliaError.message}. REST error: ${restErrorMessage}`,
            );
          }
        }

        const err = new Error(
          `Failed to index products in Algolia index '${indexName}' (language: ${validatedLanguage}) at batch ${batchNumber}/${totalBatches}: ${algoliaError.message}${algoliaError.status ? ` [Status: ${algoliaError.status}]` : ''}`,
        );
        if (algoliaError.stack) {
          err.stack = algoliaError.stack;
        }
        throw err;
      }
    }
  }
}
