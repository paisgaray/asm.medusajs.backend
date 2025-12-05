import { algoliasearch, SearchClient } from 'algoliasearch';

import type { AlgoliaProduct, AlgoliaSearchResponse, ProductInput } from './types';

type AlgoliaOptions = {
  apiKey: string;
  appId: string;
  productIndexName: string;
  regionalTagPrefixes?: string[];
};

export default class AlgoliaModuleService {
  private client: SearchClient;
  private options: AlgoliaOptions;

  constructor(_container: unknown, options: AlgoliaOptions) {
    if (!options.appId || !options.apiKey || !options.productIndexName) {
      throw new Error('Algolia configuration is incomplete');
    }

    this.client = algoliasearch(options.appId, options.apiKey);
    this.options = options;
  }

  async getIndexName(language?: string): Promise<string> {
    const baseIndexName = this.options.productIndexName;
    return language && language !== 'pt' ? `${baseIndexName}_${language}` : baseIndexName;
  }

  async deleteFromIndex(objectIDs: string[]): Promise<void> {
    if (!objectIDs || objectIDs.length === 0) {
      return;
    }

    const indexName = await this.getIndexName();
    await this.client.deleteObjects({
      indexName,
      objectIDs,
    });
  }

  async searchProducts(
    query: string,
    filters = '',
    page = 0,
    hitsPerPage = 20,
    sortBy?: string,
  ): Promise<AlgoliaSearchResponse> {
    const baseIndexName = await this.getIndexName();
    const indexName = sortBy ? `${baseIndexName}_${sortBy}` : baseIndexName;

    try {
      return (await this.client.search({
        requests: [
          {
            indexName,
            query: query || '',
            filters,
            page,
            hitsPerPage,
          },
        ],
      })) as unknown as AlgoliaSearchResponse;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string' &&
        error.message.includes('does not exist') &&
        sortBy
      ) {
        return (await this.client.search({
          requests: [
            {
              indexName: baseIndexName,
              query: query || '',
              filters,
              page,
              hitsPerPage,
            },
          ],
        })) as unknown as AlgoliaSearchResponse;
      }
      throw error;
    }
  }

  async autocomplete(query: string, hitsPerPage = 5, filters = ''): Promise<AlgoliaSearchResponse> {
    const indexName = await this.getIndexName();

    const searchParams: Record<string, unknown> = {
      query: query || '',
      hitsPerPage,
    };

    if (filters) {
      searchParams.filters = filters;
    }

    return (await this.client.search({
      requests: [
        {
          indexName,
          ...searchParams,
        },
      ],
    })) as unknown as AlgoliaSearchResponse;
  }

  private getRegionalTags(tagValues: string[]): string[] {
    const prefixes = this.options.regionalTagPrefixes || [];

    if (prefixes.length > 0) {
      return tagValues.filter((t) => {
        const lowerTag = t.toLowerCase();
        return prefixes.some((prefix) => lowerTag.startsWith(prefix.toLowerCase()));
      });
    }

    return tagValues.filter((t) => {
      const lowerTag = t.toLowerCase();
      return (lowerTag.includes('-') || lowerTag.includes('_')) && /^[a-z]{2,3}[-_]/.test(lowerTag);
    });
  }

  transformProductForIndexing(product: ProductInput, language: string = 'pt'): AlgoliaProduct {
    const tagValues = Array.isArray(product.tags)
      ? product.tags.map((tag) => (typeof tag === 'string' ? tag : tag.value || tag.name || ''))
      : [];

    const collectionIds: string[] = [];
    if (product.collection_id) {
      collectionIds.push(product.collection_id);
    }
    if (Array.isArray(product.collections)) {
      const ids = product.collections.map((col) => (typeof col === 'string' ? col : col.id || '')).filter(Boolean);
      collectionIds.push(...ids);
    }

    const pricesByRegion = product.prices_by_region || {};
    let defaultPrice = 0;

    if (Object.keys(pricesByRegion).length > 0) {
      const priceValues = Object.values(pricesByRegion).filter((p) => typeof p === 'number' && p > 0);
      defaultPrice = priceValues[0] || 0;
    } else if (Array.isArray(product.variants) && product.variants.length > 0) {
      const firstVariant = product.variants[0];
      const calculatedPrice = firstVariant.calculated_price as { calculated_amount?: number } | undefined;

      if (calculatedPrice?.calculated_amount != null) {
        defaultPrice = calculatedPrice.calculated_amount;
      } else if (Array.isArray(firstVariant.prices) && firstVariant.prices.length > 0) {
        defaultPrice = firstVariant.prices[0].amount || 0;
      }
    }

    let createdAtIndex: number;
    if (product.created_at) {
      if (typeof product.created_at === 'string') {
        const date = new Date(product.created_at);
        createdAtIndex = isNaN(date.getTime()) ? Date.now() : date.getTime();
      } else if (typeof product.created_at === 'number') {
        createdAtIndex = product.created_at;
      } else {
        createdAtIndex = product.created_at.getTime();
      }
    } else {
      createdAtIndex = Date.now();
    }

    return {
      objectID: product.id,
      title: product.title || '',
      description: product.description || '',
      handle: product.handle || '',
      thumbnail: product.thumbnail || '',
      language,
      variants: Array.isArray(product.variants)
        ? product.variants.map((variant) => ({
            id: variant.id || '',
            title: variant.title || '',
            sku: variant.sku || '',
          }))
        : [],
      sku: product.variants?.[0]?.sku || '',
      tags: tagValues,
      regional_tags: this.getRegionalTags(tagValues),
      collections: [...new Set(collectionIds)],
      prices_by_region: pricesByRegion,
      price: defaultPrice,
      created_at: createdAtIndex,
      popularity: (product.variants?.[0]?.sales_count as number | undefined) || 0,
    };
  }

  async indexProducts(products: ProductInput[], language: string = 'pt', indexNameOverride?: string): Promise<void> {
    if (!products || products.length === 0) {
      return;
    }

    const indexName = indexNameOverride || (await this.getIndexName(language));
    const transformedProducts = products.map((product) => this.transformProductForIndexing(product, language));

    await this.client.saveObjects({
      indexName,
      objects: transformedProducts,
    });
  }
}
