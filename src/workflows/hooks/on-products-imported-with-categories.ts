import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { createProductsWorkflow, createProductCategoriesWorkflow } from '@medusajs/medusa/core-flows';

import { getCategoryMappingFromCache } from '../../api/admin/products/imports/file-cache';

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

    // 7. Associar produtos às categorias (suportando múltiplas categorias)
    // Usar Link Module diretamente (mesmo padrão usado para sales channels)
    // As categorias de produtos no MedusaJS são gerenciadas via Link Module
    const linkModule = container.resolve(ContainerRegistrationKeys.LINK);
    let productsAssociated = 0;

    for (const product of products || []) {
      const productHandle = product.handle;
      if (!productHandle || !productCategoryMap.has(productHandle)) continue;

      const categoryHandles = productCategoryMap.get(productHandle)!;
      const categoryIds = categoryHandles.map((handle) => allCategoryIds[handle]).filter((id) => id) as string[];

      if (categoryIds.length > 0) {
        try {
          // Remover associações existentes primeiro (se houver)
          // Buscar links existentes para este produto com categorias
          try {
            const existingLinks = await linkModule.list({
              [Modules.PRODUCT]: { product_id: product.id },
            });

            // Deletar apenas links de categorias
            for (const link of existingLinks || []) {
              // Verificar se é um link de categoria
              // O formato pode variar, vamos verificar todas as chaves
              const linkKeys = Object.keys(link || {});
              for (const key of linkKeys) {
                if (
                  key !== Modules.PRODUCT &&
                  (key.toLowerCase().includes('category') || key.includes('PRODUCT_CATEGORY'))
                ) {
                  try {
                    await linkModule.delete({
                      [Modules.PRODUCT]: { product_id: product.id },
                      [key]: link[key],
                    });
                  } catch {
                    // Ignorar erros ao deletar
                  }
                }
              }
            }
          } catch {
            // Ignorar erros ao listar (pode não haver links existentes)
          }

          // Criar novos links para cada categoria
          // No MedusaJS, o link entre produto e categoria usa o formato:
          // { [Modules.PRODUCT]: { product_id }, [Modules.PRODUCT_CATEGORY]: { product_category_id } }
          // Mas como não temos certeza do nome exato do módulo, vamos tentar diferentes formatos
          let linksCreated = 0;
          for (const categoryId of categoryIds) {
            try {
              // Formato 1: Tentar com Modules.PRODUCT_CATEGORY (se existir)
              try {
                await linkModule.create({
                  [Modules.PRODUCT]: { product_id: product.id },
                  product_category: { product_category_id: categoryId },
                });
                linksCreated++;
              } catch {
                // Formato 2: Tentar com 'product_category' como string
                try {
                  await linkModule.create({
                    [Modules.PRODUCT]: { product_id: product.id },
                    product_category: { product_category_id: categoryId },
                  });
                  linksCreated++;
                } catch {
                  // Formato 3: Tentar com 'product_category' e apenas 'id'
                  try {
                    await linkModule.create({
                      [Modules.PRODUCT]: { product_id: product.id },
                      product_category: { id: categoryId },
                    });
                    linksCreated++;
                  } catch {
                    logger.warn(
                      `[HOOK] productsCreated: Não foi possível criar link para categoria ${categoryId} (handle: ${categoryHandles[categoryIds.indexOf(categoryId)]}) no produto ${productHandle}. Tentando próximo formato...`,
                    );
                    // Formato 4: Tentar usando apenas o ID da categoria diretamente
                    try {
                      await linkModule.create({
                        [Modules.PRODUCT]: { product_id: product.id },
                        product_category: { id: categoryId },
                      });
                      linksCreated++;
                    } catch {
                      logger.error(
                        `[HOOK] productsCreated: Todos os formatos falharam para categoria ${categoryId} no produto ${productHandle}`,
                      );
                    }
                  }
                }
              }
            } catch (linkError) {
              logger.warn(
                `[HOOK] productsCreated: Erro ao criar link para categoria ${categoryId} no produto ${productHandle}: ${linkError}`,
              );
            }
          }

          if (linksCreated > 0) {
            productsAssociated++;
            logger.info(
              `[HOOK] productsCreated: ✅ Produto "${productHandle}" associado a ${linksCreated}/${categoryIds.length} categorias: ${categoryHandles.join(', ')}`,
            );
          } else {
            logger.error(
              `[HOOK] productsCreated: ❌ Nenhum link foi criado para o produto "${productHandle}" (tentou ${categoryIds.length} categorias)`,
            );
          }
        } catch (error) {
          logger.error(`[HOOK] productsCreated: ❌ Erro ao associar categorias ao produto ${productHandle}:`, error);
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

    logger.info('[HOOK] productsCreated: ========================================');
    logger.info(`[HOOK] productsCreated: ✅ Processamento concluído!`);
    logger.info(`[HOOK] productsCreated:   - Produtos associados: ${productsAssociated}`);
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
