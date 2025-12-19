import { algoliasearch, SearchClient } from 'algoliasearch';

import type {
  AlgoliaProduct,
  AlgoliaSearchRequest,
  AlgoliaSearchResponse,
  AlgoliaRecentSearchesResponse,
  AlgoliaRecentSearch,
  ProductInput,
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
      throw new Error('Algolia configuration is incomplete');
    }

    this.client = algoliasearch(options.appId, options.apiKey);
    this.options = options;
  }

  getSupportedLanguages(): string[] {
    return this.options.supportedLanguages || ['pt'];
  }

  isLanguageSupported(language: string): boolean {
    return this.getSupportedLanguages().includes(language.toLowerCase());
  }

  validateLanguage(language?: string): string {
    if (!language) return 'pt';
    const normalized = language.toLowerCase();
    return this.isLanguageSupported(normalized) ? normalized : 'pt';
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
    const base = this.options.productIndexName;
    if (language && language !== 'pt') {
      return `${base}_${language}`;
    }
    return type === 'product' ? base : base;
  }

  async deleteFromIndex(objectIDs: string[], language?: string): Promise<void> {
    if (!objectIDs?.length) return;
    const indexName = await this.getIndexName('product', language);
    await this.client.deleteObjects({ indexName, objectIDs });
  }

  async clearIndex(language?: string): Promise<void> {
    const indexName = await this.getIndexName('product', language);

    try {
      const allObjectIDs: string[] = [];
      let page = 0;
      const hitsPerPage = 1000;
      let totalHits = 0;
      let hasMore = true;
      const maxPages = 1000;

      while (hasMore && page < maxPages) {
        const searchRequest: AlgoliaSearchRequest = {
          requests: [
            {
              indexName,
              query: '',
              page,
              hitsPerPage,
              attributesToRetrieve: ['objectID'],
            },
          ],
        };

        const result = (await this.client.search(searchRequest)) as AlgoliaSearchResponse;
        const firstResult = result.results?.[0];
        const hits = firstResult?.hits || [];
        const nbHits = firstResult?.nbHits || 0;

        if (page === 0) {
          totalHits = nbHits;
          if (totalHits === 0) {
            return;
          }
        }

        if (hits.length > 0) {
          const objectIDs = hits.map((hit) => hit.objectID).filter((id): id is string => typeof id === 'string');
          allObjectIDs.push(...objectIDs);
        }

        hasMore = hits.length === hitsPerPage && allObjectIDs.length < totalHits;
        page++;
      }

      if (allObjectIDs.length > 0) {
        const batchSize = 1000;
        for (let i = 0; i < allObjectIDs.length; i += batchSize) {
          const batch = allObjectIDs.slice(i, i + batchSize);
          await this.client.deleteObjects({ indexName, objectIDs: batch });
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      const algoliaError = this.normalizeError(error);
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
    return parts.join(' AND ');
  }

  private createSearchRequest(
    indexName: string,
    query: string,
    page: number,
    hitsPerPage: number,
    filterString?: string,
  ): AlgoliaSearchRequest {
    const request: AlgoliaSearchRequest['requests'][number] = {
      indexName,
      query,
      page,
      hitsPerPage,
    };

    if (filterString) {
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
    const indexName = sortBy ? `${baseIndex}_${sortBy}` : baseIndex;

    const filterParts = filters ? [filters] : [];
    const regionalFilters = language ? this.buildRegionalTagFilters(language.toLowerCase()) : [];
    const filterString = this.buildFilterString(filterParts, regionalFilters);

    const searchRequest = this.createSearchRequest(indexName, query || '', page, hitsPerPage, filterString);

    try {
      return (await this.client.search(searchRequest)) as AlgoliaSearchResponse;
    } catch (error) {
      const algoliaError = this.normalizeError(error);
      const isIndexError = algoliaError.message.includes('does not exist');

      if (isIndexError && sortBy) {
        const fallbackFilters = filters ? [filters] : [];
        const fallbackRegional = language ? this.buildRegionalTagFilters(language.toLowerCase()) : [];
        const fallbackFilterString = this.buildFilterString(fallbackFilters, fallbackRegional);

        const fallbackRequest = this.createSearchRequest(
          baseIndex,
          query || '',
          page,
          hitsPerPage,
          fallbackFilterString,
        );
        return (await this.client.search(fallbackRequest)) as AlgoliaSearchResponse;
      }
      throw error;
    }
  }

  async autocomplete(query: string, hitsPerPage = 5, filters = '', language?: string): Promise<AlgoliaSearchResponse> {
    const indexName = await this.getIndexName('product', language);
    const filterParts = filters ? [filters] : [];
    const regionalFilters = language ? this.buildRegionalTagFilters(language.toLowerCase()) : [];
    const filterString = this.buildFilterString(filterParts, regionalFilters);

    const searchRequest = this.createSearchRequest(indexName, query || '', 0, hitsPerPage, filterString);
    return (await this.client.search(searchRequest)) as AlgoliaSearchResponse;
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
    const pricesByRegion = product.prices_by_region || {};
    if (Object.keys(pricesByRegion).length > 0) {
      const values = Object.values(pricesByRegion).filter((p) => typeof p === 'number' && p > 0);
      if (values.length > 0) return values[0];
    }

    const firstVariant = product.variants?.[0];
    if (!firstVariant) return 0;

    const calculatedPrice = firstVariant.calculated_price;
    if (calculatedPrice?.calculated_amount != null) {
      return calculatedPrice.calculated_amount;
    }

    if (Array.isArray(firstVariant.prices) && firstVariant.prices.length > 0) {
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

    const tagValues = Array.isArray(product.tags)
      ? product.tags.map((tag) => (typeof tag === 'string' ? tag : tag.value || tag.name || ''))
      : [];

    const collectionIds: string[] = [];
    if (product.collection_id) collectionIds.push(product.collection_id);
    if (Array.isArray(product.collections)) {
      const ids = product.collections.map((col) => (typeof col === 'string' ? col : col.id || '')).filter(Boolean);
      collectionIds.push(...ids);
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
          }))
        : [],
      sku: product.variants?.[0]?.sku || '',
      tags: tagValues,
      regional_tags: regionalTags,
      collections: [...new Set(collectionIds)],
      prices_by_region: product.prices_by_region || {},
      price: this.getProductPrice(product),
      created_at: this.getCreatedAtIndex(product.created_at),
      popularity: product.variants?.[0]?.sales_count || 0,
    };
  }

  async indexProducts(products: ProductInput[], language: string = 'pt', indexNameOverride?: string): Promise<void> {
    if (!products?.length) return;

    const validatedLanguage = this.validateLanguage(language);
    const indexName = indexNameOverride || (await this.getIndexName('product', validatedLanguage));
    const transformed = products.map((p) => this.transformProductForIndexing(p, validatedLanguage));

    try {
      await this.client.saveObjects({ indexName, objects: transformed });
    } catch (error) {
      const algoliaError = this.normalizeError(error);
      const err = new Error(
        `Failed to index products in Algolia index '${indexName}' (language: ${validatedLanguage}): ${algoliaError.message}${algoliaError.status ? ` [Status: ${algoliaError.status}]` : ''}`,
      );
      if (algoliaError.stack) {
        err.stack = algoliaError.stack;
      }
      throw err;
    }
  }
}
