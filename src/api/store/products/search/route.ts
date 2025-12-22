import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';

import { ALGOLIA_MODULE, SalesChannel, SalesChannelMetadata } from '../../../../modules/algolia';
import AlgoliaModuleService from '../../../../modules/algolia/service';
import { searchProductsWorkflow } from '../../../../workflows/algolia';
import type { StoreProductSearchBody } from './validators';

async function getSalesChannelFromRequest(req: MedusaRequest): Promise<SalesChannel | null> {
  try {
    const salesChannelService = req.scope.resolve(Modules.SALES_CHANNEL);
    const headerId = req.headers['x-sales-channel-id'] as string;
    const queryId = req.query['sales_channel_id'] as string;
    const id = headerId || queryId;

    if (id) {
      if (typeof salesChannelService.retrieveSalesChannel === 'function') {
        return (await salesChannelService.retrieveSalesChannel(id)) as SalesChannel;
      }
      const channels = await salesChannelService.listSalesChannels({ id });
      if (channels?.length > 0) return channels[0] as SalesChannel;
    }

    const publishableKey = req.headers['x-publishable-api-key'] as string;
    if (publishableKey) {
      const channels = await salesChannelService.listSalesChannels({});
      if (channels?.length > 0) return channels[0] as SalesChannel;
    }

    return null;
  } catch {
    return null;
  }
}

function extractLanguageFromSalesChannel(
  salesChannel: SalesChannel | null,
  algoliaService: AlgoliaModuleService,
): string {
  if (!salesChannel?.metadata) return 'pt';

  const metadata: SalesChannelMetadata = salesChannel.metadata;
  let tags: string[] = [];

  if (metadata.regional_tags) {
    if (Array.isArray(metadata.regional_tags)) {
      tags = metadata.regional_tags.filter((t): t is string => typeof t === 'string');
    } else if (typeof metadata.regional_tags === 'string') {
      tags = metadata.regional_tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }

  return tags.length > 0 ? algoliaService.extractLanguageFromRegionalTags(tags) : 'pt';
}

export async function POST(req: MedusaRequest<StoreProductSearchBody>, res: MedusaResponse): Promise<void> {
  try {
    const body = req.validatedBody as StoreProductSearchBody;
    const algoliaService: AlgoliaModuleService = req.scope.resolve(ALGOLIA_MODULE);

    let language: string | undefined;

    if (body.language) {
      if (!algoliaService.isLanguageSupported(body.language)) {
        res.status(400).json({
          message: `Language '${body.language}' is not supported. Supported languages: ${algoliaService.getSupportedLanguages().join(', ')}`,
        });
        return;
      }
      language = algoliaService.validateLanguage(body.language);
    } else {
      try {
        const salesChannel = await getSalesChannelFromRequest(req);
        if (salesChannel) {
          language = extractLanguageFromSalesChannel(salesChannel, algoliaService);
        }
      } catch {
        language = 'pt';
      }
    }

    const input: {
      query: string;
      language?: string;
      filters?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
    } = {
      query: body.query,
      language,
    };

    if (body.filters) input.filters = body.filters;
    if (body.page !== undefined) input.page = body.page;
    if (body.limit !== undefined) input.limit = body.limit;
    if (body.sortBy) input.sortBy = body.sortBy;

    const { result } = await searchProductsWorkflow(req.scope).run({ input });

    res.json(result || { products: [], total: 0, page: 0, nbHits: 0, nbPages: 0, query: body.query });
  } catch (error) {
    let errorMessage = 'An unknown error occurred.';

    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    } else if (error && typeof error === 'object') {
      if ('message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if ('error' in error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else {
        errorMessage = JSON.stringify(error);
      }
    }

    res.status(500).json({
      code: 'unknown_error',
      type: 'unknown_error',
      message: errorMessage,
    });
  }
}
