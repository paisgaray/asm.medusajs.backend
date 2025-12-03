import { algoliasearch, SearchClient } from 'algoliasearch';

import type { AlgoliaProduct, AlgoliaSearchResponse, ProductInput } from './types';

type AlgoliaOptions = {
  apiKey: string;
  appId: string;
  productIndexName: string;
};

export type AlgoliaIndexType = 'product';

export default class AlgoliaModuleService {
  private client: SearchClient;
  private options: AlgoliaOptions;

  constructor(_container: unknown, options: AlgoliaOptions) {
    if (!options.appId || !options.apiKey || !options.productIndexName) {
      throw new Error(
        'Algolia configuration is incomplete. Please check ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY, and ALGOLIA_PRODUCT_INDEX_NAME environment variables.',
      );
    }

    this.client = algoliasearch(options.appId, options.apiKey);
    this.options = options;
  }

  async getIndexName(type: AlgoliaIndexType = 'product'): Promise<string> {
    switch (type) {
      case 'product':
        return this.options.productIndexName;
      default:
        throw new Error(`Invalid index type: ${type}`);
    }
  }

  async indexData(data: AlgoliaProduct[], type: AlgoliaIndexType = 'product'): Promise<void> {
    const indexName = await this.getIndexName(type);

    if (!data || data.length === 0) {
      return;
    }

    await this.client.saveObjects({
      indexName,
      objects: data,
    });
  }

  async retrieveFromIndex(objectIDs: string[], type: AlgoliaIndexType = 'product') {
    const indexName = await this.getIndexName(type);

    if (!objectIDs || objectIDs.length === 0) {
      return { results: [] };
    }

    return await this.client.getObjects<Record<string, unknown>>({
      requests: objectIDs.map((objectID) => ({
        indexName,
        objectID,
      })),
    });
  }

  async deleteFromIndex(objectIDs: string[], type: AlgoliaIndexType = 'product'): Promise<void> {
    const indexName = await this.getIndexName(type);

    if (!objectIDs || objectIDs.length === 0) {
      return;
    }

    await this.client.deleteObjects({
      indexName,
      objectIDs,
    });
  }

  async search(query: string, type: AlgoliaIndexType = 'product'): Promise<AlgoliaSearchResponse> {
    const indexName = await this.getIndexName(type);

    return (await this.client.search({
      requests: [
        {
          indexName,
          query: query || '',
        },
      ],
    })) as unknown as AlgoliaSearchResponse;
  }

  transformProductForIndexing(product: ProductInput, language: string = 'pt'): AlgoliaProduct {
    const tagValues =
      product.tags && Array.isArray(product.tags)
        ? product.tags.map((tag) => (typeof tag === 'string' ? tag : tag.value || tag.name || ''))
        : [];

    const collectionIds: string[] = [];
    if (product.collection_id) {
      collectionIds.push(product.collection_id);
    }
    if (product.collections && Array.isArray(product.collections)) {
      const ids = product.collections.map((col) => (typeof col === 'string' ? col : col.id || '')).filter((id) => id);
      collectionIds.push(...ids);
    }

    return {
      objectID: product.id,
      title: product.title || '',
      description: product.description || '',
      handle: product.handle || '',
      thumbnail: product.thumbnail || '',
      language,
      variants:
        product.variants && Array.isArray(product.variants)
          ? product.variants.map((variant) => ({
              id: variant.id || '',
              title: variant.title || '',
              sku: variant.sku || '',
            }))
          : [],
      sku: product.variants?.[0]?.sku || '',
      tags: tagValues,
      regional_tags: tagValues.filter((t) => t.startsWith('sp-') || t.startsWith('rj-') || t.startsWith('mg-')),
      collections: [...new Set(collectionIds)],
      prices_by_region: product.prices_by_region || {},
    };
  }

  async indexProducts(products: ProductInput[], language: string = 'pt'): Promise<void> {
    if (!products || products.length === 0) {
      return;
    }

    const transformedProducts = products.map((product) => this.transformProductForIndexing(product, language));

    await this.indexData(transformedProducts, 'product');
  }
}
