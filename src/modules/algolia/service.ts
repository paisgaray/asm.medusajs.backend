import { algoliasearch, SearchClient } from 'algoliasearch';

type AlgoliaOptions = {
  apiKey: string;
  appId: string;
  productIndexName: string;
};

export type AlgoliaIndexType = 'product';

export default class AlgoliaModuleService {
  private client: SearchClient;
  private options: AlgoliaOptions;

  constructor({}, options: AlgoliaOptions) {
    if (!options.appId || !options.apiKey || !options.productIndexName) {
      throw new Error('Algolia configuration is incomplete. Please check ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY, and ALGOLIA_PRODUCT_INDEX_NAME environment variables.');
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

  async indexData(data: Record<string, unknown>[], type: AlgoliaIndexType = 'product'): Promise<void> {
    const indexName = await this.getIndexName(type);
    
    if (!data || data.length === 0) {
      return;
    }

    await this.client.saveObjects({
      indexName,
      objects: data.map((item) => ({
        ...item,
        objectID: item.id as string,
      })),
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

  async search(query: string, type: AlgoliaIndexType = 'product') {
    try {
      const indexName = await this.getIndexName(type);
      
      const result = await this.client.search({
        requests: [
          {
            indexName,
            query: query || '',
          },
        ],
      });

      return result;
    } catch (error) {
      console.error('Algolia search error:', error);
      throw new Error(`Algolia search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

