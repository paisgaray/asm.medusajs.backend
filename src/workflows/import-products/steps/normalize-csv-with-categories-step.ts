import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { createProductCategoriesWorkflow } from '@medusajs/medusa/core-flows';

/**
 * Step customizado para normalizar CSV com processamento de categorias
 *
 * Este step processa a coluna "Product Category" do arquivo do cliente,
 * cria categorias automaticamente se não existirem, e retorna o CSV modificado
 * com a coluna "Product Category 1" preenchida com IDs de categorias.
 *
 * Seguindo a documentação:
 * - https://docs.medusajs.com/resources/references/medusa-workflows/importProductsWorkflow
 * - https://github.com/medusajs/medusa/blob/de08ea732b599374a071c016fa8af2e4f3e31075/packages/core/core-flows/src/product/steps/normalize-products.ts
 */

type NormalizeCsvWithCategoriesStepInput = {
  fileContent: string; // CSV content (base64 ou string)
  filename: string;
};

type NormalizeCsvWithCategoriesStepOutput = {
  fileContent: string; // CSV modificado (base64)
  filename: string;
  categoryMapping?: Record<string, string>; // product_handle -> category_path (para uso no hook)
};

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

export const normalizeCsvWithCategoriesStep = createStep(
  'normalize-csv-with-categories',
  async (input: NormalizeCsvWithCategoriesStepInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    logger.info('[STEP] normalizeCsvWithCategories: ========================================');
    logger.info('[STEP] normalizeCsvWithCategories: INICIANDO processamento de CSV com categorias');
    logger.info(`[STEP] normalizeCsvWithCategories: Arquivo: ${input.filename}`);
    logger.info('[STEP] normalizeCsvWithCategories: ========================================');

    try {
      // 1. Converter CSV para string (pode vir como base64 ou string)
      let csvContent: string;
      try {
        // Tentar decodificar como base64 primeiro
        csvContent = Buffer.from(input.fileContent, 'base64').toString('utf-8');
        // Se o resultado não fizer sentido como CSV, tentar usar como string direta
        if (!csvContent.includes(',') && !csvContent.includes('\n')) {
          csvContent = input.fileContent;
        }
      } catch {
        // Se falhar, usar como string direta
        csvContent = input.fileContent;
      }

      const lines = csvContent.split('\n').filter((line) => line.trim());

      if (lines.length === 0) {
        throw new Error('CSV vazio');
      }

      // 2. Parse do cabeçalho (suportando CSV com aspas)
      const headerLine = lines[0];
      const headers: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < headerLine.length; i++) {
        const char = headerLine[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          headers.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      if (current) headers.push(current.trim().replace(/^"|"$/g, ''));

      const categoryColumnIndex = headers.indexOf('Product Category');

      if (categoryColumnIndex === -1) {
        logger.warn(
          '[STEP] normalizeCsvWithCategories: Coluna "Product Category" não encontrada, retornando CSV original',
        );
        // Se não tiver coluna de categoria, retornar CSV original sem categoryMapping
        return new StepResponse<NormalizeCsvWithCategoriesStepOutput>({
          fileContent: input.fileContent,
          filename: input.filename,
          categoryMapping: undefined,
        });
      }

      logger.info(
        `[STEP] normalizeCsvWithCategories: ✅ Coluna "Product Category" encontrada no índice ${categoryColumnIndex}`,
      );
      logger.info(`[STEP] normalizeCsvWithCategories: Total de linhas no CSV: ${lines.length}`);

      // 3. Processar linhas e extrair categorias (suportando múltiplas categorias separadas por |)
      logger.info(
        '[STEP] normalizeCsvWithCategories: Processando linhas e extraindo categorias (suportando múltiplas categorias)...',
      );
      const categoryMap = new Map<string, CategoryHierarchy>();
      const productCategoryMap = new Map<string, string[]>(); // product_handle -> array de category_child_handles
      const categoryMapping: Record<string, string> = {}; // product_handle -> category_path (original do CSV)

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Parse CSV linha (suportando aspas)
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            if (inQuotes && line[j + 1] === '"') {
              // Escaped quote
              current += '"';
              j++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        if (current) values.push(current.trim().replace(/^"|"$/g, ''));

        if (values.length <= categoryColumnIndex) continue;

        const categoryPath = values[categoryColumnIndex];
        if (!categoryPath) continue;

        const handleIndex = headers.indexOf('Product Handle');
        const productHandle = handleIndex >= 0 ? values[handleIndex] : null;

        if (!productHandle) continue;

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
          // Armazenar mapeamento original para uso no hook
          categoryMapping[productHandle] = categoryPath;
        }
      }

      logger.info(`[STEP] normalizeCsvWithCategories: ✅ ${categoryMap.size} categorias únicas encontradas`);
      logger.info(`[STEP] normalizeCsvWithCategories: ✅ ${productCategoryMap.size} produtos mapeados para categorias`);

      // Log exemplos de categorias encontradas
      if (categoryMap.size > 0) {
        const examples = Array.from(categoryMap.entries()).slice(0, 5);
        logger.info('[STEP] normalizeCsvWithCategories: Exemplos de categorias encontradas:');
        examples.forEach(([handle, hierarchy]) => {
          logger.info(`  - Handle: ${handle}, Child: ${hierarchy.child}, Parent: ${hierarchy.parent || 'N/A'}`);
        });
      }

      // 4. Buscar categorias existentes no banco
      logger.info('[STEP] normalizeCsvWithCategories: Buscando categorias existentes no banco...');
      const existingCategories = await query.graph({
        entity: 'product_category',
        fields: ['id', 'handle', 'name'],
        filters: {},
      });

      const existingHandles = new Set(
        (existingCategories?.data || []).map((cat: { handle?: string }) => cat.handle).filter(Boolean) as string[],
      );
      logger.info(`[STEP] normalizeCsvWithCategories: ✅ ${existingHandles.size} categorias já existem no banco`);

      // 5. Identificar categorias que precisam ser criadas
      logger.info('[STEP] normalizeCsvWithCategories: Identificando categorias que precisam ser criadas...');
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

      // 6. Criar categorias pais primeiro
      const parentCategoriesCreated: Record<string, string> = {}; // handle -> id

      logger.info(
        `[STEP] normalizeCsvWithCategories: Categorias a criar - Pais: ${parentHandlesToCreate.size}, Filhas: ${childHandlesToCreate.size}`,
      );

      if (parentHandlesToCreate.size > 0) {
        logger.info(`[STEP] normalizeCsvWithCategories: 🏗️ Criando ${parentHandlesToCreate.size} categorias pais...`);

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

        if (createdParents?.product_categories) {
          logger.info(
            `[STEP] normalizeCsvWithCategories: ✅ ${createdParents.product_categories.length} categorias pais criadas com sucesso`,
          );
          for (const cat of createdParents.product_categories) {
            if (cat.handle) {
              parentCategoriesCreated[cat.handle] = cat.id;
              logger.info(
                `[STEP] normalizeCsvWithCategories:   - Categoria criada: ${cat.name} (${cat.handle}) → ID: ${cat.id}`,
              );
            }
          }
        } else {
          logger.warn('[STEP] normalizeCsvWithCategories: ⚠️ Nenhuma categoria pai foi criada (resultado vazio)');
        }
      } else {
        logger.info('[STEP] normalizeCsvWithCategories: ℹ️ Nenhuma categoria pai precisa ser criada');
      }

      // 7. Criar categorias filhas
      const childCategoriesCreated: Record<string, string> = {}; // handle -> id

      if (childHandlesToCreate.size > 0) {
        logger.info(`[STEP] normalizeCsvWithCategories: 🏗️ Criando ${childHandlesToCreate.size} categorias filhas...`);

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
              // Buscar ID da categoria pai existente
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

        if (createdChildren?.product_categories) {
          logger.info(
            `[STEP] normalizeCsvWithCategories: ✅ ${createdChildren.product_categories.length} categorias filhas criadas com sucesso`,
          );
          for (const cat of createdChildren.product_categories) {
            if (cat.handle) {
              childCategoriesCreated[cat.handle] = cat.id;
              logger.info(
                `[STEP] normalizeCsvWithCategories:   - Categoria criada: ${cat.name} (${cat.handle}) → ID: ${cat.id}`,
              );
            }
          }
        } else {
          logger.warn('[STEP] normalizeCsvWithCategories: ⚠️ Nenhuma categoria filha foi criada (resultado vazio)');
        }
      } else {
        logger.info('[STEP] normalizeCsvWithCategories: ℹ️ Nenhuma categoria filha precisa ser criada');
      }

      // 8. Consolidar todos os IDs de categorias (existentes + criadas)
      logger.info('[STEP] normalizeCsvWithCategories: Consolidando IDs de categorias (existentes + criadas)...');
      const allCategoryIds: Record<string, string> = {}; // handle -> id

      // Adicionar existentes
      for (const cat of existingCategories?.data || []) {
        if (cat.handle) {
          allCategoryIds[cat.handle] = cat.id;
        }
      }

      // Adicionar criadas
      Object.assign(allCategoryIds, parentCategoriesCreated);
      Object.assign(allCategoryIds, childCategoriesCreated);

      logger.info(
        `[STEP] normalizeCsvWithCategories: ✅ Total de ${Object.keys(allCategoryIds).length} categorias disponíveis (existentes + criadas)`,
      );

      // 9. Remover coluna "Product Category" do CSV e adicionar "Product Category 1", "Product Category 2", etc. com IDs
      // Também converter preços de EUR para centavos (MedusaJS armazena preços em centavos)
      logger.info(
        '[STEP] normalizeCsvWithCategories: Modificando CSV (removendo Product Category, adicionando Product Category 1, 2, etc., convertendo preços)...',
      );
      const modifiedLines: string[] = [];

      // Calcular número máximo de categorias por produto
      let maxCategories = 1;
      for (const categoryHandles of productCategoryMap.values()) {
        if (categoryHandles.length > maxCategories) {
          maxCategories = categoryHandles.length;
        }
      }
      logger.info(`[STEP] normalizeCsvWithCategories: Máximo de ${maxCategories} categorias por produto encontrado`);

      // Modificar cabeçalho: remover "Product Category", adicionar "Product Category 1", "Product Category 2", etc.
      const modifiedHeaders = [...headers];
      modifiedHeaders.splice(categoryColumnIndex, 1);

      // Encontrar posição para inserir colunas de categoria (após Product Type Id)
      const typeIdIndex = modifiedHeaders.indexOf('Product Type Id');
      const insertIndex = typeIdIndex >= 0 ? typeIdIndex + 1 : modifiedHeaders.length;

      // Adicionar múltiplas colunas de categoria se necessário
      for (let i = 1; i <= maxCategories; i++) {
        modifiedHeaders.splice(insertIndex + i - 1, 0, `Product Category ${i}`);
      }

      // Encontrar índices das colunas de preço
      const priceEurIndex = headers.indexOf('Variant Price EUR');
      const priceUsdIndex = headers.indexOf('Variant Price USD');

      modifiedLines.push(modifiedHeaders.map((h) => `"${h}"`).join(','));

      // Modificar linhas de dados
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Parse CSV linha novamente
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            if (inQuotes && line[j + 1] === '"') {
              current += '"';
              j++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        if (current) values.push(current.trim().replace(/^"|"$/g, ''));

        if (values.length <= categoryColumnIndex) continue;

        const handleIndex = headers.indexOf('Product Handle');
        const productHandle = handleIndex >= 0 ? values[handleIndex] : null;

        // Converter preços de EUR para centavos ANTES de modificar o array (MedusaJS armazena em centavos)
        // Exemplo: 18.75 EUR -> 1875 centavos
        if (priceEurIndex >= 0 && priceEurIndex < values.length) {
          const priceEurValue = values[priceEurIndex];
          if (priceEurValue && priceEurValue.trim()) {
            try {
              // Remover vírgulas e converter para número
              const priceInEur = parseFloat(priceEurValue.replace(',', '.'));
              if (!isNaN(priceInEur) && priceInEur > 0) {
                // Converter para centavos (multiplicar por 100)
                const priceInCents = Math.round(priceInEur * 100);
                values[priceEurIndex] = String(priceInCents);
                logger.info(
                  `[STEP] normalizeCsvWithCategories: Preço convertido: ${priceInEur} EUR -> ${priceInCents} centavos (handle: ${productHandle})`,
                );
              }
            } catch (error) {
              logger.warn(`[STEP] normalizeCsvWithCategories: Erro ao converter preço EUR para centavos: ${error}`);
            }
          }
        }

        // Converter preços de USD para centavos (se existir)
        if (priceUsdIndex >= 0 && priceUsdIndex < values.length) {
          const priceUsdValue = values[priceUsdIndex];
          if (priceUsdValue && priceUsdValue.trim()) {
            try {
              const priceInUsd = parseFloat(priceUsdValue.replace(',', '.'));
              if (!isNaN(priceInUsd) && priceInUsd > 0) {
                const priceInCents = Math.round(priceInUsd * 100);
                values[priceUsdIndex] = String(priceInCents);
              }
            } catch (error) {
              logger.warn(`[STEP] normalizeCsvWithCategories: Erro ao converter preço USD para centavos: ${error}`);
            }
          }
        }

        // Remover valor da coluna Product Category
        const modifiedValues = [...values];
        modifiedValues.splice(categoryColumnIndex, 1);

        // Inserir Product Category 1, 2, etc. com IDs das categorias
        const categoryIds: string[] = [];
        if (productHandle && productCategoryMap.has(productHandle)) {
          const categoryHandles = productCategoryMap.get(productHandle)!;
          for (const categoryHandle of categoryHandles) {
            const categoryId = allCategoryIds[categoryHandle] || '';
            if (categoryId) {
              categoryIds.push(categoryId);
            }
          }
        }

        // Preencher todas as colunas de categoria (preencher com vazio se não houver categoria)
        for (let i = 0; i < maxCategories; i++) {
          const categoryId = i < categoryIds.length ? categoryIds[i] : '';
          modifiedValues.splice(insertIndex + i, 0, categoryId);
        }

        // Escapar valores para CSV
        const escapedValues = modifiedValues.map((v) => {
          const escaped = String(v).replace(/"/g, '""');
          return `"${escaped}"`;
        });

        modifiedLines.push(escapedValues.join(','));
      }

      // 10. Retornar CSV modificado
      const modifiedCsv = modifiedLines.join('\n');
      const modifiedBase64 = Buffer.from(modifiedCsv).toString('base64');

      logger.info('[STEP] normalizeCsvWithCategories: ========================================');
      logger.info(`[STEP] normalizeCsvWithCategories: ✅ CSV modificado com sucesso!`);
      logger.info(`[STEP] normalizeCsvWithCategories:   - Produtos mapeados: ${productCategoryMap.size}`);
      logger.info(`[STEP] normalizeCsvWithCategories:   - Categorias processadas: ${categoryMap.size}`);
      logger.info(
        `[STEP] normalizeCsvWithCategories:   - Categorias criadas: ${Object.keys(parentCategoriesCreated).length + Object.keys(childCategoriesCreated).length}`,
      );
      logger.info(`[STEP] normalizeCsvWithCategories:   - Linhas no CSV final: ${modifiedLines.length}`);
      logger.info(
        `[STEP] normalizeCsvWithCategories:   - CategoryMapping preparado: ${Object.keys(categoryMapping).length} produtos`,
      );
      logger.info('[STEP] normalizeCsvWithCategories: ========================================');

      return new StepResponse<NormalizeCsvWithCategoriesStepOutput>({
        fileContent: modifiedBase64,
        filename: input.filename,
        categoryMapping: Object.keys(categoryMapping).length > 0 ? categoryMapping : undefined,
      });
    } catch (error) {
      logger.error('[STEP] normalizeCsvWithCategories: ========================================');
      logger.error('[STEP] normalizeCsvWithCategories: ❌ ERRO ao processar categorias');
      logger.error(
        `[STEP] normalizeCsvWithCategories: Erro: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.stack) {
        logger.error(`[STEP] normalizeCsvWithCategories: Stack: ${error.stack}`);
      }
      logger.error('[STEP] normalizeCsvWithCategories: Retornando CSV original (fallback)');
      logger.error('[STEP] normalizeCsvWithCategories: ========================================');
      // Em caso de erro, retornar CSV original sem categoryMapping
      return new StepResponse<NormalizeCsvWithCategoriesStepOutput>({
        fileContent: input.fileContent,
        filename: input.filename,
        categoryMapping: undefined,
      });
    }
  },
);
