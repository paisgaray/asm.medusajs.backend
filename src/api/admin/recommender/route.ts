import { InvokeEndpointCommand, SageMakerRuntimeClient } from '@aws-sdk/client-sagemaker-runtime';
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import type { RecommenderSchema } from './validators';

type ProductSummary = {
  id: string;
  title: string | null;
  handle: string | null;
  thumbnail: string | null;
};

type RecommendationGroup = {
  group_index: number;
  products: ProductSummary[];
};

async function callSageMaker(endpointName: string, payload: Record<string, string>): Promise<string[][]> {
  const accessKeyId = process.env.SAGEMAKER_ACCESSKEYID;
  const secretAccessKey = process.env.SAGEMAKER_SECRETACCESSKEYID;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('SageMaker credentials not configured (SAGEMAKER_ACCESSKEYID / SAGEMAKER_SECRETACCESSKEYID)');
  }

  const client = new SageMakerRuntimeClient({
    region: 'eu-central-1',
    credentials: { accessKeyId, secretAccessKey },
  });

  const command = new InvokeEndpointCommand({
    EndpointName: endpointName,
    ContentType: 'application/json',
    Body: Buffer.from(JSON.stringify(payload)),
  });

  const response = await client.send(command);

  const raw = JSON.parse(Buffer.from(response.Body as Uint8Array).toString('utf-8'));
  const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid response from SageMaker: expected array');
  }

  return parsed as string[][];
}

export async function POST(req: AuthenticatedMedusaRequest<RecommenderSchema>, res: MedusaResponse) {
  const body = req.validatedBody;
  const query = req.scope.resolve('query');

  const endpointName = body.type === 'bundle' ? 'registered-basket' : 'registered-products';

  // Build snake_case payload matching the storefront function signatures
  const payload: Record<string, string> =
    body.type === 'bundle'
      ? {
          id_cliente: body.id_cliente,
          codigo_postal: body.codigo_postal,
          mes: body.mes,
          dia: body.dia,
          hora: body.hora,
          dia_semana: body.dia_semana,
          top_k_baskets: body.top_k_baskets,
          page_size: body.page_size,
        }
      : {
          id_cliente: body.id_cliente,
          codigo_postal: body.codigo_postal,
          mes: body.mes,
          dia: body.dia,
          hora: body.hora,
          dia_semana: body.dia_semana,
          top_k_categories: body.top_k_categories,
          first_k_categories: body.first_k_categories,
          qty_products_first_k_categories: body.qty_products_first_k_categories,
          qty_products_rest_categories: body.qty_products_rest_categories,
          page_size: body.page_size,
        };

  let groups: string[][];
  try {
    groups = await callSageMaker(endpointName, payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error calling SageMaker';
    return res.status(502).json({ message });
  }

  // Flatten all unique IDs for a single Medusa query
  const allIds = [...new Set(groups.flat())].filter(Boolean);

  const productMap = new Map<string, ProductSummary>();

  if (allIds.length > 0) {
    const { data: products } = await query.graph({
      entity: 'product',
      fields: ['id', 'title', 'handle', 'thumbnail'],
      filters: { id: allIds },
    });

    for (const product of products) {
      productMap.set(product.id, {
        id: product.id,
        title: (product.title as string) ?? null,
        handle: (product.handle as string) ?? null,
        thumbnail: (product.thumbnail as string) ?? null,
      });
    }
  }

  const resolvedIds = new Set(productMap.keys());
  const unresolvedIds = allIds.filter((id) => !resolvedIds.has(id));

  const recommendations: RecommendationGroup[] = groups.map((group, index) => ({
    group_index: index,
    products: group
      .filter(Boolean)
      .map((id): ProductSummary => productMap.get(id) ?? { id, title: null, handle: null, thumbnail: null }),
  }));

  res.json({
    type: body.type,
    endpoint: endpointName,
    recommendations,
    unresolved_ids: unresolvedIds,
  });
}
