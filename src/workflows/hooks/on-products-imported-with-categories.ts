import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { createProductsWorkflow, createProductCategoriesWorkflow } from '@medusajs/medusa/core-flows';

import { getCategoryMappingFromCache } from '../../api/admin/products/imports/file-cache';
import { ALGOLIA_MODULE } from '../../modules/algolia';
import { areSubscribersEnabled } from '../../modules/algolia/feature-flags';
import AlgoliaModuleService from '../../modules/algolia/service';
import { indexProductWorkflow } from '../../workflows/algolia/index-product';

/**
 * Hook Handler para processar categorias após criação de produtos via importProductsWorkflow
 *
 * Este hook intercepta productsCreated do createProductsWorkflow (usado internamente pelo importProductsWorkflow)
 * e processa a coluna "Product Category" do CSV original para criar categorias e associá-las aos produtos.
 *
 * Seguindo a documentação:
 * - https://docs.medusajs.com/learn/fundamentals/workflows/workflow-hooks
 * - https://docs.medusajs.com/resources/references/medusa-workflows/importProductsWorkflow
 */

// Função para gerar handle em kebab-case, removendo acentos
function generateHandle(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Função para extrair categoria: primeiro split por |, depois por »
type CategoryHierarchy = {
  parent?: string;
  child: string;
  parentHandle?: string;
  childHandle: string;
};

function extractCategoryHierarchy(categoryPath: string): CategoryHierarchy | null {
  if (!categoryPath || typeof categoryPath !== 'string') return null;

  // Primeiro split por | e pegar apenas a primeira parte
  const firstPart = categoryPath.split('|')[0].trim();
  if (!firstPart) return null;

  // Depois split por » para hierarquia
  const parts = firstPart
    .split('»')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  if (parts.length === 1) {
    // Apenas categoria filha
    return {
      child: parts[0],
      childHandle: generateHandle(parts[0]),
    };
  }

  // Última parte é o filho, resto é o pai
  const child = parts[parts.length - 1];
  const parent = parts.slice(0, -1).join(' » ');

  return {
    parent,
    child,
    parentHandle: generateHandle(parent),
    childHandle: generateHandle(child),
  };
}

/**
 * Hook handler para productsCreated
 *
 * Processa categorias após produtos serem criados via importProductsWorkflow.
 *
 * Espera que additional_data contenha:
 * - categoryMapping: Map<productHandle, categoryPath>
 * - csvContent: conteúdo CSV original (opcional, para debug)
 */
createProductsWorkflow.hooks.productsCreated(async ({ products, additional_data }, { container }) => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info('[HOOK] productsCreated: ========================================');
  logger.info(`[HOOK] productsCreated: ${products?.length || 0} produtos criados`);
  logger.info('[HOOK] productsCreated: Processando categorias...');

  try {
    // Verificar se há informações de categoria no additional_data
    let categoryMapping = additional_data?.categoryMapping as Record<string, string> | undefined;

    // Se não encontrou no additional_data, tentar buscar do cache usando transaction_id
    if (!categoryMapping || Object.keys(categoryMapping).length === 0) {
      logger.info(
        '[HOOK] productsCreated: categoryMapping não encontrado em additional_data, tentando buscar do cache...',
      );

      // Tentar obter transaction_id do contexto do workflow
      // O transaction_id pode estar disponível em diferentes lugares
      let transactionId: string | undefined;

      // Tentar obter do additional_data primeiro
      transactionId = (additional_data as Record<string, unknown>)?.transaction_id as string | undefined;

      // Se não encontrou, tentar obter do container (contexto do workflow)
      if (!transactionId) {
        try {
          // O MedusaJS pode passar o transaction_id através do workflow context
          const workflowContext = (container as Record<string, unknown>)?.workflow as
            | Record<string, unknown>
            | undefined;
          transactionId = workflowContext?.transaction_id as string | undefined;
        } catch {
          // Ignorar erro
        }
      }

      // Se ainda não encontrou, tentar buscar por qualquer chave no cache que contenha categoryMapping
      // Isso é um fallback caso o transaction_id não esteja disponível
      if (!transactionId) {
        logger.warn(
          '[HOOK] productsCreated: transaction_id não encontrado, tentando buscar categoryMapping por handle dos produtos...',
        );

        // Tentar buscar categoryMapping usando os handles dos produtos criados
        // Isso funciona se o cache usar handles como chave
        if (products && products.length > 0) {
          for (const product of products) {
            if (product.handle) {
              const cachedMapping = getCategoryMappingFromCache(product.handle);
              if (cachedMapping && Object.keys(cachedMapping).length > 0) {
                categoryMapping = cachedMapping;
                logger.info(
                  `[HOOK] productsCreated: ✅ categoryMapping encontrado no cache usando handle: ${product.handle}`,
                );
                break;
              }
            }
          }
        }
      } else {
        logger.info(`[HOOK] productsCreated: Buscando categoryMapping do cache com transaction_id: ${transactionId}`);
        const cachedMapping = getCategoryMappingFromCache(transactionId);
        if (cachedMapping && Object.keys(cachedMapping).length > 0) {
          categoryMapping = cachedMapping;
          logger.info(
            `[HOOK] productsCreated: ✅ categoryMapping encontrado no cache: ${Object.keys(categoryMapping).length} produtos`,
          );
        } else {
          // Se não encontrou por transaction_id, tentar por handle dos produtos (fallback)
          logger.warn(
            '[HOOK] productsCreated: categoryMapping não encontrado por transaction_id, tentando por handle...',
          );
          if (products && products.length > 0) {
            for (const product of products) {
              if (product.handle) {
                const cachedMapping = getCategoryMappingFromCache(product.handle);
                if (cachedMapping && Object.keys(cachedMapping).length > 0) {
                  categoryMapping = cachedMapping;
                  logger.info(
                    `[HOOK] productsCreated: ✅ categoryMapping encontrado no cache usando handle: ${product.handle}`,
                  );
                  break;
                }
              }
            }
          }
        }
      }
    }

    if (!categoryMapping || Object.keys(categoryMapping).length === 0) {
      logger.info('[HOOK] productsCreated: Nenhuma informação de categoria encontrada em additional_data nem no cache');
      logger.info(`[HOOK] productsCreated: additional_data keys: ${Object.keys(additional_data || {}).join(', ')}`);
      logger.info('[HOOK] productsCreated: ========================================');
      return;
    }

    logger.info(
      `[HOOK] productsCreated: ${Object.keys(categoryMapping).length} produtos com categorias para processar`,
    );
    logger.info(`[HOOK] productsCreated: Handles no categoryMapping: ${Object.keys(categoryMapping).join(', ')}`);
    logger.info(
      `[HOOK] productsCreated: Handles dos produtos criados: ${(products || []).map((p) => p.handle).join(', ')}`,
    );

    // 1. Extrair hierarquias de categorias (suportando múltiplas categorias separadas por |)
    const categoryMap = new Map<string, CategoryHierarchy>();
    const productCategoryMap = new Map<string, string[]>(); // product_handle -> array de category_child_handles

    for (const [productHandle, categoryPath] of Object.entries(categoryMapping)) {
      // Processar todas as categorias separadas por |
      const categoryPaths = categoryPath
        .split('|')
        .map((p) => p.trim())
        .filter(Boolean);
      const categoryHandles: string[] = [];

      for (const singleCategoryPath of categoryPaths) {
        const hierarchy = extractCategoryHierarchy(singleCategoryPath);
        if (hierarchy) {
          categoryMap.set(hierarchy.childHandle, hierarchy);
          categoryHandles.push(hierarchy.childHandle);
        }
      }

      if (categoryHandles.length > 0) {
        productCategoryMap.set(productHandle, categoryHandles);
        logger.info(
          `[HOOK] productsCreated: Produto "${productHandle}" terá ${categoryHandles.length} categorias: ${categoryHandles.join(', ')}`,
        );
      } else {
        logger.warn(
          `[HOOK] productsCreated: ⚠️ Nenhuma hierarquia extraída para o produto "${productHandle}" com categoria "${categoryPath}"`,
        );
      }
    }

    logger.info(`[HOOK] productsCreated: ${categoryMap.size} categorias únicas encontradas`);

    // 2. Buscar categorias existentes no banco
    const existingCategories = await query.graph({
      entity: 'product_category',
      fields: ['id', 'handle', 'name'],
      filters: {},
    });

    const existingHandles = new Set(
      (existingCategories?.data || []).map((cat: { handle?: string }) => cat.handle).filter(Boolean) as string[],
    );
    logger.info(`[HOOK] productsCreated: ${existingHandles.size} categorias já existem no banco`);

    // 3. Identificar categorias que precisam ser criadas
    const parentHandlesToCreate = new Set<string>();
    const childHandlesToCreate = new Set<string>();

    for (const [handle, hierarchy] of categoryMap.entries()) {
      if (!existingHandles.has(handle)) {
        childHandlesToCreate.add(handle);

        if (hierarchy.parentHandle && !existingHandles.has(hierarchy.parentHandle)) {
          parentHandlesToCreate.add(hierarchy.parentHandle);
        }
      }
    }

    logger.info(
      `[HOOK] productsCreated: Categorias a criar - Pais: ${parentHandlesToCreate.size}, Filhas: ${childHandlesToCreate.size}`,
    );

    // 4. Criar categorias pais primeiro
    const parentCategoriesCreated: Record<string, string> = {};

    if (parentHandlesToCreate.size > 0) {
      logger.info(`[HOOK] productsCreated: 🏗️ Criando ${parentHandlesToCreate.size} categorias pais...`);

      const parentsPayload = Array.from(parentHandlesToCreate).map((handle) => {
        const hierarchy = Array.from(categoryMap.values()).find((h) => h.parentHandle === handle);
        return {
          name: hierarchy?.parent || handle,
          handle,
        };
      });

      const { result: createdParents } = await createProductCategoriesWorkflow(container).run({
        input: {
          product_categories: parentsPayload,
        },
      });

      if (createdParents && Array.isArray(createdParents) && createdParents.length > 0) {
        logger.info(`[HOOK] productsCreated: ✅ ${createdParents.length} categorias pais criadas`);
        for (const cat of createdParents) {
          if (cat.handle) {
            parentCategoriesCreated[cat.handle] = cat.id;
          }
        }
      }
    }

    // 5. Criar categorias filhas
    const childCategoriesCreated: Record<string, string> = {};

    if (childHandlesToCreate.size > 0) {
      logger.info(`[HOOK] productsCreated: 🏗️ Criando ${childHandlesToCreate.size} categorias filhas...`);

      const childrenPayload = Array.from(childHandlesToCreate)
        .map((handle) => {
          const hierarchy = categoryMap.get(handle);
          if (!hierarchy) return null;

          const payload: { name: string; handle: string; parent_category_id?: string } = {
            name: hierarchy.child,
            handle: hierarchy.childHandle,
          };

          if (hierarchy.parentHandle && parentCategoriesCreated[hierarchy.parentHandle]) {
            payload.parent_category_id = parentCategoriesCreated[hierarchy.parentHandle];
          } else if (hierarchy.parentHandle && existingHandles.has(hierarchy.parentHandle)) {
            const existingParent = (existingCategories?.data || []).find(
              (cat: { handle?: string; id?: string }) => cat.handle === hierarchy.parentHandle,
            );
            if (existingParent) {
              payload.parent_category_id = existingParent.id;
            }
          }

          return payload;
        })
        .filter(Boolean) as Array<{ name: string; handle: string; parent_category_id?: string }>;

      const { result: createdChildren } = await createProductCategoriesWorkflow(container).run({
        input: {
          product_categories: childrenPayload,
        },
      });

      if (createdChildren && Array.isArray(createdChildren) && createdChildren.length > 0) {
        logger.info(`[HOOK] productsCreated: ✅ ${createdChildren.length} categorias filhas criadas`);
        for (const cat of createdChildren) {
          if (cat.handle) {
            childCategoriesCreated[cat.handle] = cat.id;
          }
        }
      }
    }

    // 6. Consolidar IDs de categorias
    const allCategoryIds: Record<string, string> = {};

    for (const cat of existingCategories?.data || []) {
      if (cat.handle) {
        allCategoryIds[cat.handle] = cat.id;
      }
    }

    Object.assign(allCategoryIds, parentCategoriesCreated);
    Object.assign(allCategoryIds, childCategoriesCreated);

    logger.info(`[HOOK] productsCreated: ✅ Total de ${Object.keys(allCategoryIds).length} categorias disponíveis`);

    // 7. Verificar se categorias já foram associadas pelo batchProductsWorkflow
    // O batchProductsWorkflow já associa categorias quando o campo "categories" está presente no input
    // Vamos verificar se as categorias já foram associadas antes de tentar criar links manualmente
    logger.info('[HOOK] productsCreated: Verificando se categorias já foram associadas pelo batchProductsWorkflow...');
    const linkModule = container.resolve(ContainerRegistrationKeys.LINK);
    let productsAssociated = 0;
    let productsAlreadyAssociated = 0;

    for (const product of products || []) {
      const productHandle = product.handle;
      if (!productHandle || !productCategoryMap.has(productHandle)) continue;

      const categoryHandles = productCategoryMap.get(productHandle)!;
      const categoryIds = categoryHandles.map((handle) => allCategoryIds[handle]).filter((id) => id) as string[];

      if (categoryIds.length > 0) {
        try {
          // Verificar se o produto já tem categorias associadas
          const productWithCategories = await query.graph({
            entity: 'product',
            fields: ['id', 'categories.id', 'categories.handle'],
            filters: {
              id: product.id,
            },
          });

          const existingCategories =
            (productWithCategories?.data?.[0] as { categories?: Array<{ id?: string }> })?.categories || [];
          const existingCategoryIds = existingCategories.map((cat) => cat.id).filter(Boolean) as string[];

          // Verificar se todas as categorias esperadas já estão associadas
          const allCategoriesAssociated = categoryIds.every((expectedId) => existingCategoryIds.includes(expectedId));

          if (allCategoriesAssociated && existingCategoryIds.length > 0) {
            productsAlreadyAssociated++;
            logger.info(
              `[HOOK] productsCreated: ✅ Produto "${productHandle}" já possui categorias associadas pelo batchProductsWorkflow: ${existingCategoryIds.length} categorias`,
            );
          } else {
            // Categorias não foram associadas ou estão incompletas - tentar associar via Link Module
            logger.info(
              `[HOOK] productsCreated: Produto "${productHandle}" não possui todas as categorias. Esperadas: ${categoryIds.length}, Encontradas: ${existingCategoryIds.length}. Tentando associar via Link Module...`,
            );

            let linksCreated = 0;

            for (const categoryId of categoryIds) {
              // Pular se já está associada
              if (existingCategoryIds.includes(categoryId)) {
                continue;
              }

              try {
                // Tentar criar link usando o formato correto do MedusaJS
                // O formato correto é: { [Modules.PRODUCT]: { product_id }, product_category: { id } }
                await linkModule.create({
                  [Modules.PRODUCT]: { product_id: product.id },
                  product_category: { id: categoryId },
                });
                linksCreated++;
                logger.info(
                  `[HOOK] productsCreated: ✅ Link criado para categoria ${categoryId} no produto ${productHandle}`,
                );
              } catch (linkError) {
                const errorMessage = linkError instanceof Error ? linkError.message : String(linkError);
                // Se o erro for de duplicação, significa que já existe - isso é OK
                if (
                  errorMessage.toLowerCase().includes('already exists') ||
                  errorMessage.toLowerCase().includes('duplicate') ||
                  errorMessage.toLowerCase().includes('unique constraint')
                ) {
                  logger.info(
                    `[HOOK] productsCreated: ℹ️ Categoria ${categoryId} já está associada ao produto ${productHandle}`,
                  );
                  linksCreated++; // Contar como sucesso
                } else {
                  logger.warn(
                    `[HOOK] productsCreated: ⚠️ Erro ao criar link para categoria ${categoryId} no produto ${productHandle}: ${errorMessage}`,
                  );
                }
              }
            }

            if (linksCreated > 0) {
              productsAssociated++;
              logger.info(
                `[HOOK] productsCreated: ✅ Produto "${productHandle}" associado a ${linksCreated}/${categoryIds.length} categorias via Link Module`,
              );
            } else if (existingCategoryIds.length > 0) {
              // Produto já tinha algumas categorias, mas não todas
              productsAlreadyAssociated++;
              logger.info(
                `[HOOK] productsCreated: ℹ️ Produto "${productHandle}" já possui ${existingCategoryIds.length} categorias associadas`,
              );
            } else {
              logger.error(
                `[HOOK] productsCreated: ❌ Nenhum link foi criado para o produto "${productHandle}" (tentou ${categoryIds.length} categorias)`,
              );
            }
          }
        } catch (error) {
          logger.error(
            `[HOOK] productsCreated: ❌ Erro ao verificar/associar categorias ao produto ${productHandle}:`,
            error,
          );
          if (error instanceof Error) {
            logger.error(`[HOOK] productsCreated: Erro detalhado: ${error.message}`);
            if (error.stack) {
              logger.error(`[HOOK] productsCreated: Stack: ${error.stack}`);
            }
          }
        }
      } else {
        logger.warn(
          `[HOOK] productsCreated: ⚠️ Nenhuma categoria encontrada para o produto "${productHandle}" (handles: ${categoryHandles.join(', ')})`,
        );
      }
    }

    // Atualizar contador total
    productsAssociated += productsAlreadyAssociated;

    // 8. Associar Sales Channel padrão aos produtos (se não tiverem nenhum)
    logger.info('[HOOK] productsCreated: Associando Sales Channel padrão aos produtos...');
    let salesChannelsAssociated = 0;

    try {
      const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
      type SalesChannel = {
        id: string;
        name?: string | null;
        is_default?: boolean;
      };
      const salesChannels = (await salesChannelModule.listSalesChannels({})) as SalesChannel[];
      let defaultSalesChannelId: string | undefined;

      if (salesChannels && salesChannels.length > 0) {
        // Tenta encontrar "Default Sales Channel" ou o canal padrão (is_default) ou o primeiro
        const defaultChannel =
          salesChannels.find((sc) => sc.name?.toLowerCase().includes('default') || sc.is_default === true) ||
          salesChannels[0];
        defaultSalesChannelId = defaultChannel.id;
        logger.info(
          `[HOOK] productsCreated: ✅ Sales Channel padrão encontrado: ${defaultChannel.name || 'N/A'} (${defaultSalesChannelId})`,
        );
      }

      if (defaultSalesChannelId) {
        for (const product of products || []) {
          try {
            // Tentar associar o Sales Channel padrão diretamente
            // Se já existir, o linkModule.create vai lançar um erro que vamos ignorar
            try {
              await linkModule.create({
                [Modules.PRODUCT]: { product_id: product.id },
                [Modules.SALES_CHANNEL]: { sales_channel_id: defaultSalesChannelId },
              });
              salesChannelsAssociated++;
              logger.info(
                `[HOOK] productsCreated: ✅ Sales Channel padrão associado ao produto ${product.handle || product.id}`,
              );
            } catch (linkError) {
              // Se o erro for de duplicação, significa que já existe - isso é OK
              const errorMessage =
                linkError instanceof Error ? linkError.message.toLowerCase() : String(linkError).toLowerCase();
              if (
                errorMessage.includes('already exists') ||
                errorMessage.includes('duplicate') ||
                errorMessage.includes('unique constraint')
              ) {
                logger.info(
                  `[HOOK] productsCreated: ℹ️ Produto ${product.handle || product.id} já possui Sales Channel associado`,
                );
              } else {
                logger.warn(
                  `[HOOK] productsCreated: ⚠️ Erro ao associar Sales Channel padrão ao produto ${product.handle || product.id}: ${linkError instanceof Error ? linkError.message : String(linkError)}`,
                );
              }
            }
          } catch (error) {
            logger.warn(
              `[HOOK] productsCreated: ⚠️ Erro ao processar Sales Channel para o produto ${product.handle || product.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      } else {
        logger.warn('[HOOK] productsCreated: ⚠️ Nenhum Sales Channel padrão encontrado no banco');
      }
    } catch (error) {
      logger.warn(
        `[HOOK] productsCreated: ⚠️ Erro ao processar Sales Channels: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // 9. Garantir sincronização Algolia para todos os produtos criados/atualizados
    logger.info('[HOOK] productsCreated: Sincronizando produtos com Algolia...');
    let algoliaSynced = 0;

    if (areSubscribersEnabled()) {
      try {
        const algoliaService = container.resolve(ALGOLIA_MODULE) as AlgoliaModuleService;
        const supportedLanguages = algoliaService.getSupportedLanguages();

        let regionId: string | undefined;
        let currencyCode = 'eur';

        try {
          const regionModule = container.resolve('region');
          const regions = await regionModule.listRegions({});
          if (regions && regions.length > 0) {
            regionId = regions[0].id;
            currencyCode = regions[0].currency_code || 'eur';
          }
        } catch {
          // Ignorar erro ao buscar região
        }

        for (const product of products || []) {
          if (!product.id) continue;

          for (const language of supportedLanguages) {
            try {
              await indexProductWorkflow(container).run({
                input: {
                  product_id: product.id,
                  language,
                  region_id: regionId,
                  currency_code: currencyCode,
                },
              });
              algoliaSynced++;
              logger.info(
                `[HOOK] productsCreated: ✅ Produto ${product.handle || product.id} indexado no Algolia (${language})`,
              );
            } catch (algoliaError) {
              logger.warn(
                `[HOOK] productsCreated: ⚠️ Erro ao indexar produto ${product.handle || product.id} no Algolia (${language}): ${algoliaError instanceof Error ? algoliaError.message : String(algoliaError)}`,
              );
            }
          }
        }
      } catch (error) {
        logger.warn(
          `[HOOK] productsCreated: ⚠️ Erro ao processar sincronização Algolia: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      logger.info('[HOOK] productsCreated: ℹ️ Subscribers Algolia desabilitados (feature flag)');
    }

    logger.info('[HOOK] productsCreated: ========================================');
    logger.info(`[HOOK] productsCreated: ✅ Processamento concluído!`);
    logger.info(`[HOOK] productsCreated:   - Produtos com categorias (já associadas + novas): ${productsAssociated}`);
    logger.info(`[HOOK] productsCreated:   - Produtos associados a Sales Channels: ${salesChannelsAssociated}`);
    logger.info(`[HOOK] productsCreated:   - Produtos sincronizados com Algolia: ${algoliaSynced}`);
    logger.info(
      `[HOOK] productsCreated:   - Categorias criadas: ${Object.keys(parentCategoriesCreated).length + Object.keys(childCategoriesCreated).length}`,
    );
    logger.info('[HOOK] productsCreated: ========================================');
  } catch (error) {
    logger.error('[HOOK] productsCreated: ========================================');
    logger.error('[HOOK] productsCreated: ❌ ERRO ao processar categorias');
    logger.error(`[HOOK] productsCreated: Erro: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      logger.error(`[HOOK] productsCreated: Stack: ${error.stack}`);
    }
    logger.error('[HOOK] productsCreated: ========================================');
  }
});
