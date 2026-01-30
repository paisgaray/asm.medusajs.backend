import { ContainerRegistrationKeys, CSVNormalizer, productValidators } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { csv2json } from 'json-2-csv';

/**
 * Step que converte CSV normalizado (com categorias já processadas) para o formato batchRequest
 * que o batchProductsWorkflow espera.
 *
 * Este step faz a mesma coisa que o normalizeCsvStep do MedusaJS, mas aceita CSV já normalizado
 * (com Product Category 1 preenchido com IDs de categorias).
 */

type NormalizeCsvToBatchRequestStepInput = {
  fileContent: string; // CSV normalizado (base64)
};

type ProductData = ReturnType<typeof productValidators.CreateProduct.parse>;
type UpdateProductData = ReturnType<typeof productValidators.UpdateProduct.parse>;

type NormalizeCsvToBatchRequestStepOutput = {
  create: ProductData[];
  update: UpdateProductData[];
};

export const normalizeCsvToBatchRequestStep = createStep(
  'normalize-csv-to-batch-request',
  async (input: NormalizeCsvToBatchRequestStepInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

    logger.info('[STEP] normalizeCsvToBatchRequest: ========================================');
    logger.info('[STEP] normalizeCsvToBatchRequest: Convertendo CSV normalizado para batchRequest...');

    try {
      // Decodificar CSV de base64
      let csvContent: string;
      try {
        csvContent = Buffer.from(input.fileContent, 'base64').toString('utf-8');
        if (!csvContent.includes(',') && !csvContent.includes('\n')) {
          csvContent = input.fileContent;
        }
      } catch {
        csvContent = input.fileContent;
      }

      logger.info(`[STEP] normalizeCsvToBatchRequest: CSV decodificado, tamanho: ${csvContent.length} caracteres`);

      // Detectar delimitador (mesma lógica do MedusaJS)
      const delimiters = [',', ';', '|'];
      let delimiter = ',';
      const header = csvContent.split('\n')[0];
      for (const del of delimiters) {
        if (header.split(del).length > 1) {
          delimiter = del;
          break;
        }
      }

      // Converter CSV para JSON usando json-2-csv (mesma biblioteca usada pelo MedusaJS)
      // csv2json é síncrono conforme implementação do MedusaJS
      const csvProducts = csv2json(csvContent, {
        preventCsvInjection: true,
        delimiter: { field: delimiter },
      }) as Record<string, string>[];
      logger.info(`[STEP] normalizeCsvToBatchRequest: ✅ ${csvProducts.length} linhas convertidas para JSON`);

      // Usar o CSVNormalizer do MedusaJS para processar os produtos
      const normalizer = new CSVNormalizer(csvProducts.map((row, index) => CSVNormalizer.preProcess(row, index + 1)));

      const products = normalizer.proccess();
      logger.info(
        `[STEP] normalizeCsvToBatchRequest: Produtos processados - toCreate: ${Object.keys(products.toCreate).length}, toUpdate: ${Object.keys(products.toUpdate).length}`,
      );

      // Verificar produtos existentes no banco para evitar duplicação
      // Buscar produtos por handle e variantes por SKU
      const query = container.resolve(ContainerRegistrationKeys.QUERY);
      const handlesToCheck = Object.keys(products.toCreate);
      const skusToCheck: string[] = [];

      // Extrair SKUs dos produtos que serão criados
      for (const handle of handlesToCheck) {
        const productData = products.toCreate[handle];
        if (productData?.variants && Array.isArray(productData.variants)) {
          for (const variant of productData.variants) {
            if (variant.sku && typeof variant.sku === 'string') {
              skusToCheck.push(variant.sku);
            }
          }
        }
      }

      logger.info(
        `[STEP] normalizeCsvToBatchRequest: Verificando ${handlesToCheck.length} handles e ${skusToCheck.length} SKUs no banco...`,
      );

      // Buscar produtos existentes por handle
      const existingProductsByHandle: Record<string, string> = {}; // handle -> product_id
      if (handlesToCheck.length > 0) {
        try {
          const handleQueryResult = await query.graph({
            entity: 'product',
            fields: ['id', 'handle'],
            filters: {
              handle: handlesToCheck,
            },
          });

          if (handleQueryResult?.data) {
            for (const product of handleQueryResult.data as Array<{ handle?: string; id?: string }>) {
              if (product.handle && product.id) {
                existingProductsByHandle[product.handle] = product.id;
              }
            }
          }
          logger.info(
            `[STEP] normalizeCsvToBatchRequest: ✅ ${Object.keys(existingProductsByHandle).length} produtos encontrados por handle`,
          );
        } catch (error) {
          logger.warn(`[STEP] normalizeCsvToBatchRequest: Erro ao buscar produtos por handle: ${error}`);
        }
      }

      // Buscar variantes existentes por SKU (para encontrar produtos)
      const existingProductsBySku: Record<string, string> = {}; // sku -> product_id
      if (skusToCheck.length > 0) {
        try {
          const skuQueryResult = await query.graph({
            entity: 'product_variant',
            fields: ['id', 'sku', 'product_id'],
            filters: {
              sku: skusToCheck,
            },
          });

          if (skuQueryResult?.data) {
            for (const variant of skuQueryResult.data as Array<{ sku?: string; product_id?: string }>) {
              if (variant.sku && variant.product_id) {
                existingProductsBySku[variant.sku] = variant.product_id;
              }
            }
          }
          logger.info(
            `[STEP] normalizeCsvToBatchRequest: ✅ ${Object.keys(existingProductsBySku).length} produtos encontrados por SKU`,
          );
        } catch (error) {
          logger.warn(`[STEP] normalizeCsvToBatchRequest: Erro ao buscar produtos por SKU: ${error}`);
        }
      }

      // Separar produtos que devem ser criados vs atualizados
      const productsToCreate: ProductData[] = [];
      const productsToUpdate: UpdateProductData[] = [];

      // Processar produtos que o normalizer marcou para criar
      for (const handle of handlesToCheck) {
        const productData = products.toCreate[handle];

        // Verificar se o produto já existe (por handle ou SKU)
        let existingProductId: string | undefined = existingProductsByHandle[handle];

        if (!existingProductId && productData?.variants && Array.isArray(productData.variants)) {
          // Tentar encontrar por SKU da primeira variante
          for (const variant of productData.variants) {
            if (variant.sku && existingProductsBySku[variant.sku]) {
              existingProductId = existingProductsBySku[variant.sku];
              break;
            }
          }
        }

        if (existingProductId) {
          // Produto existe, mover para atualização
          logger.info(
            `[STEP] normalizeCsvToBatchRequest: Produto ${handle} já existe (ID: ${existingProductId}), movendo para atualização`,
          );
          try {
            // Buscar o produto existente para obter IDs das variantes
            const existingProductResult = await query.graph({
              entity: 'product',
              fields: ['id', 'variants.id', 'variants.sku'],
              filters: {
                id: existingProductId,
              },
            });

            const existingProduct = existingProductResult?.data?.[0] as
              | { variants?: Array<{ sku?: string; id?: string }> }
              | undefined;
            const existingVariantsBySku = new Map<string, string>();

            if (existingProduct?.variants) {
              for (const variant of existingProduct.variants) {
                if (variant.sku && variant.id) {
                  existingVariantsBySku.set(variant.sku, variant.id);
                }
              }
            }

            // Atualizar variantes existentes com seus IDs
            if (productData.variants && Array.isArray(productData.variants)) {
              productData.variants = productData.variants.map(
                (variant: { sku?: string; id?: string; [key: string]: unknown }) => {
                  if (variant.sku && existingVariantsBySku.has(variant.sku)) {
                    return {
                      ...variant,
                      id: existingVariantsBySku.get(variant.sku),
                    };
                  }
                  return variant;
                },
              );
            }

            const updateData = {
              ...productData,
              id: existingProductId,
            };
            const validated = productValidators.UpdateProduct.parse(updateData);
            productsToUpdate.push(validated);
          } catch (error) {
            logger.warn(
              `[STEP] normalizeCsvToBatchRequest: Erro ao validar produto para atualizar (handle: ${handle}): ${error}`,
            );
          }
        } else {
          // Produto não existe, criar
          try {
            const validated = productValidators.CreateProduct.parse(productData);
            productsToCreate.push(validated);
          } catch (error) {
            logger.warn(
              `[STEP] normalizeCsvToBatchRequest: Erro ao validar produto para criar (handle: ${handle}): ${error}`,
            );
          }
        }
      }

      // Processar produtos que o normalizer já marcou para atualizar
      for (const updateId of Object.keys(products.toUpdate)) {
        try {
          const validated = productValidators.UpdateProduct.parse(products.toUpdate[updateId]);
          productsToUpdate.push(validated);
        } catch (error) {
          logger.warn(
            `[STEP] normalizeCsvToBatchRequest: Erro ao validar produto para atualizar (id: ${updateId}): ${error}`,
          );
        }
      }

      const create = productsToCreate;
      const update = productsToUpdate;

      logger.info(`[STEP] normalizeCsvToBatchRequest: ========================================`);
      logger.info(`[STEP] normalizeCsvToBatchRequest: ✅ Conversão concluída!`);
      logger.info(`[STEP] normalizeCsvToBatchRequest:   - Produtos para criar: ${create.length}`);
      logger.info(`[STEP] normalizeCsvToBatchRequest:   - Produtos para atualizar: ${update.length}`);
      logger.info(`[STEP] normalizeCsvToBatchRequest: ========================================`);

      return new StepResponse<NormalizeCsvToBatchRequestStepOutput>({
        create,
        update,
      });
    } catch (error) {
      logger.error('[STEP] normalizeCsvToBatchRequest: ========================================');
      logger.error('[STEP] normalizeCsvToBatchRequest: ❌ ERRO ao converter CSV para batchRequest');
      logger.error(
        `[STEP] normalizeCsvToBatchRequest: Erro: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.stack) {
        logger.error(`[STEP] normalizeCsvToBatchRequest: Stack: ${error.stack}`);
      }
      logger.error('[STEP] normalizeCsvToBatchRequest: ========================================');
      throw error;
    }
  },
);
