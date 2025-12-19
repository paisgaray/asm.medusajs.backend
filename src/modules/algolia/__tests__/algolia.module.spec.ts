import { algoliasearch, SearchClient } from 'algoliasearch';

import AlgoliaModuleService from '../service';

type TestAlgoliaOptions = {
  apiKey: string;
  appId: string;
  productIndexName: string;
  regionalTagPrefixes?: string[];
  supportedLanguages?: string[];
};

jest.mock('algoliasearch', () => ({
  algoliasearch: jest.fn(),
}));

describe('AlgoliaModuleService', () => {
  let service: AlgoliaModuleService;
  let mockClient: SearchClient;
  let mockGetLogs: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetLogs = jest.fn().mockResolvedValue({
      logs: [],
    });

    mockClient = {
      search: jest.fn().mockResolvedValue({
        results: [
          {
            hits: [{ objectID: 'prod_1', title: 'Produto Teste' }],
            nbHits: 1,
            page: 0,
            nbPages: 1,
            hitsPerPage: 20,
          },
        ],
      }),
      saveObjects: jest.fn().mockResolvedValue({}),
      deleteObjects: jest.fn().mockResolvedValue({}),
      getLogs: mockGetLogs,
    } as unknown as SearchClient;

    (algoliasearch as jest.Mock).mockImplementation(() => mockClient);

    service = new AlgoliaModuleService(
      {},
      {
        appId: 'test-app-id',
        apiKey: 'test-api-key',
        productIndexName: 'test_products',
      },
    );
  });

  describe('constructor', () => {
    it('inicializa corretamente com credenciais válidas', () => {
      expect(service['client']).toBe(mockClient);
      expect(algoliasearch).toHaveBeenCalledWith('test-app-id', 'test-api-key');
    });

    it('lança erro sem credenciais', () => {
      const createService = (): AlgoliaModuleService => {
        // eslint-disable-next-line no-new
        return new AlgoliaModuleService({}, {} as TestAlgoliaOptions);
      };
      expect(createService).toThrow('Algolia configuration is incomplete');
    });

    it('lança erro sem appId', () => {
      const invalidOptions: TestAlgoliaOptions = {
        apiKey: 'test-api-key',
        productIndexName: 'test_products',
      } as TestAlgoliaOptions;
      const createService = (): AlgoliaModuleService => {
        // eslint-disable-next-line no-new
        return new AlgoliaModuleService({}, invalidOptions);
      };
      expect(createService).toThrow('Algolia configuration is incomplete');
    });

    it('lança erro sem apiKey', () => {
      const invalidOptions: TestAlgoliaOptions = {
        appId: 'test-app-id',
        productIndexName: 'test_products',
      } as TestAlgoliaOptions;
      const createService = (): AlgoliaModuleService => {
        // eslint-disable-next-line no-new
        return new AlgoliaModuleService({}, invalidOptions);
      };
      expect(createService).toThrow('Algolia configuration is incomplete');
    });
  });

  describe('getSupportedLanguages', () => {
    it('retorna idiomas padrão quando não configurado', () => {
      const languages = service.getSupportedLanguages();
      expect(languages).toEqual(['pt']);
    });

    it('retorna idiomas configurados', () => {
      const customService = new AlgoliaModuleService(
        {},
        {
          appId: 'test-app-id',
          apiKey: 'test-api-key',
          productIndexName: 'test_products',
          supportedLanguages: ['pt', 'en', 'es'],
        },
      );
      expect(customService.getSupportedLanguages()).toEqual(['pt', 'en', 'es']);
    });
  });

  describe('isLanguageSupported', () => {
    it('retorna true para idioma suportado', () => {
      expect(service.isLanguageSupported('pt')).toBe(true);
    });

    it('retorna false para idioma não suportado', () => {
      expect(service.isLanguageSupported('fr')).toBe(false);
    });

    it('é case-insensitive', () => {
      expect(service.isLanguageSupported('PT')).toBe(true);
      expect(service.isLanguageSupported('Pt')).toBe(true);
    });
  });

  describe('validateLanguage', () => {
    it('retorna idioma padrão quando não fornecido', () => {
      expect(service.validateLanguage()).toBe('pt');
      expect(service.validateLanguage(undefined)).toBe('pt');
    });

    it('retorna idioma validado quando suportado', () => {
      expect(service.validateLanguage('pt')).toBe('pt');
    });

    it('retorna padrão quando idioma não suportado', () => {
      expect(service.validateLanguage('fr')).toBe('pt');
    });
  });

  describe('mapRegionalTagToLanguage', () => {
    it('extrai idioma de tag regional pt-BR', () => {
      expect(service.mapRegionalTagToLanguage('pt-BR')).toBe('pt');
    });

    it('retorna padrão para tag inválida', () => {
      expect(service.mapRegionalTagToLanguage('invalid')).toBe('pt');
    });

    it('retorna padrão para string vazia', () => {
      expect(service.mapRegionalTagToLanguage('')).toBe('pt');
    });
  });

  describe('getIndexName', () => {
    it('retorna nome base quando language é pt', async () => {
      const indexName = await service['getIndexName']('product', 'pt');
      expect(indexName).toBe('test_products');
    });

    it('retorna nome com sufixo quando language não é pt', async () => {
      const customService = new AlgoliaModuleService(
        {},
        {
          appId: 'test-app-id',
          apiKey: 'test-api-key',
          productIndexName: 'test_products',
          supportedLanguages: ['pt', 'en'],
        },
      );
      const indexName = await customService['getIndexName']('product', 'en');
      expect(indexName).toBe('test_products_en');
    });
  });

  describe('transformProductForIndexing', () => {
    it('transforma produto corretamente', () => {
      const product = {
        id: 'prod_123',
        title: 'Produto Teste',
        description: 'Descrição',
        handle: 'produto-teste',
        thumbnail: 'thumb.jpg',
        variants: [
          {
            id: 'var_123',
            title: 'Variante 1',
            sku: 'SKU123',
            calculated_price: { calculated_amount: 1000, currency_code: 'BRL' },
          },
        ],
        tags: ['tag1', 'tag2'],
        sales_channels: [
          {
            id: 'sc_1',
            metadata: {
              regional_tags: 'pt-BR,pt-001',
            } as Record<string, string | number | boolean | null>,
          },
        ],
      };

      const result = service['transformProductForIndexing'](product, 'pt');

      expect(result.objectID).toBe('prod_123');
      expect(result.title).toBe('Produto Teste');
      expect(result.description).toBe('Descrição');
      expect(result.handle).toBe('produto-teste');
      expect(result.thumbnail).toBe('thumb.jpg');
      expect(result.language).toBe('pt');
      expect(result.variants).toHaveLength(1);
      expect(result.sku).toBe('SKU123');
      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.regional_tags).toContain('pt-BR');
      expect(result.price).toBe(1000);
    });

    it('lida com produto sem variantes', () => {
      const product = {
        id: 'prod_123',
        title: 'Produto',
      };

      const result = service['transformProductForIndexing'](product);

      expect(result.variants).toEqual([]);
      expect(result.sku).toBe('');
      expect(result.price).toBe(0);
    });
  });

  describe('indexProducts', () => {
    it('indexa produtos corretamente', async () => {
      const products = [
        {
          id: 'prod_1',
          title: 'Produto 1',
        },
        {
          id: 'prod_2',
          title: 'Produto 2',
        },
      ];

      await service.indexProducts(products, 'pt');

      expect(mockClient.saveObjects).toHaveBeenCalledWith({
        indexName: 'test_products',
        objects: expect.arrayContaining([
          expect.objectContaining({ objectID: 'prod_1' }),
          expect.objectContaining({ objectID: 'prod_2' }),
        ]),
      });
    });

    it('não indexa quando array está vazio', async () => {
      await service.indexProducts([], 'pt');
      expect(mockClient.saveObjects).not.toHaveBeenCalled();
    });
  });

  describe('searchProducts', () => {
    it('busca produtos com query', async () => {
      const result = await service.searchProducts('teste', '', 0, 20, undefined, 'pt');

      expect(mockClient.search).toHaveBeenCalled();
      expect(result.results).toBeDefined();
      expect(result.results[0].hits).toHaveLength(1);
    });

    it('busca produtos com filtros', async () => {
      await service.searchProducts('teste', 'collection:123', 0, 20, undefined, 'pt');

      expect(mockClient.search).toHaveBeenCalled();
      const callArgs = (mockClient.search as jest.Mock).mock.calls[0][0];
      expect(callArgs.requests[0].filters).toBeDefined();
    });
  });

  describe('autocomplete', () => {
    it('retorna sugestões de autocomplete', async () => {
      const result = await service.autocomplete('test', 5, '', 'pt');

      expect(mockClient.search).toHaveBeenCalled();
      expect(result.results).toBeDefined();
    });
  });

  describe('deleteFromIndex', () => {
    it('deleta produtos do índice', async () => {
      await service.deleteFromIndex(['prod_1', 'prod_2'], 'pt');

      expect(mockClient.deleteObjects).toHaveBeenCalledWith({
        indexName: 'test_products',
        objectIDs: ['prod_1', 'prod_2'],
      });
    });

    it('não deleta quando array está vazio', async () => {
      await service.deleteFromIndex([], 'pt');
      expect(mockClient.deleteObjects).not.toHaveBeenCalled();
    });
  });

  describe('getRecentSearches', () => {
    it('retorna histórico de buscas recentes', async () => {
      const mockLogs = [
        {
          timestamp: '1704067200',
          method: 'POST',
          answer_code: 200,
          query_body: JSON.stringify({ requests: [{ query: 'medusa' }] }),
          answer: JSON.stringify({ nbHits: 5 }),
          url: '',
          ip: '',
          query_headers: '',
          sha1: '',
          index_name: 'test_products',
        },
        {
          timestamp: '1704067100',
          method: 'POST',
          answer_code: 200,
          query_body: JSON.stringify({ requests: [{ query: 't-shirt' }] }),
          answer: JSON.stringify({ nbHits: 3 }),
          url: '',
          ip: '',
          query_headers: '',
          sha1: '',
          index_name: 'test_products',
        },
      ];

      mockGetLogs.mockResolvedValue({
        logs: mockLogs as unknown[],
      });

      const result = await service.getRecentSearches('pt', 5);

      expect(result.searches).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.indexName).toBe('test_products');
    });

    it('retorna array vazio quando não há logs', async () => {
      mockGetLogs.mockResolvedValue({
        logs: [],
      });

      const result = await service.getRecentSearches('pt', 5);

      expect(result.searches).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('filtra logs por indexName', async () => {
      const mockLogs = [
        {
          timestamp: '1704067200',
          method: 'POST',
          answer_code: 200,
          query_body: JSON.stringify({ requests: [{ query: 'medusa' }] }),
          answer: JSON.stringify({ nbHits: 5 }),
          url: '',
          ip: '',
          query_headers: '',
          sha1: '',
          index_name: 'other_index',
        },
      ];

      mockGetLogs.mockResolvedValue({
        logs: mockLogs as unknown[],
      });

      const result = await service.getRecentSearches('pt', 5);

      expect(result.searches).toEqual([]);
    });
  });

  describe('extractLanguageFromRegionalTags', () => {
    it('extrai idioma de tags regionais', () => {
      const tags = ['pt-BR', 'pt-001'];
      const language = service.extractLanguageFromRegionalTags(tags);
      expect(language).toBe('pt');
    });

    it('retorna padrão quando não há tags', () => {
      const language = service.extractLanguageFromRegionalTags([]);
      expect(language).toBe('pt');
    });
  });
});
