import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { createProductCategoriesWorkflow } from '@medusajs/medusa/core-flows';
import type { ProductCategoryDTO } from '@medusajs/types';

type EnsureCategoriesStepInput = {
  categoryMap: Map<string, { parent: string; child: string }>;
};

type EnsureCategoriesStepOutput = {
  categoryHandles: Map<string, string>; // handle -> id
};

export const ensureCategoriesStep = createStep(
  'ensure-categories-step',
  async (input: EnsureCategoriesStepInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const productModule = container.resolve('product');

    // Verifica categorias existentes
    const existingCategories = await productModule.listProductCategories({});
    const existingHandles = new Map<string, string>();

    if (Array.isArray(existingCategories)) {
      for (const cat of existingCategories as ProductCategoryDTO[]) {
        if (cat.handle && cat.id) {
          existingHandles.set(cat.handle, cat.id);
        }
      }
    }

    logger.info(`Encontradas ${existingCategories.length} categorias existentes`);

    // Coleta pais e filhos únicos
    const uniqueParents = new Set<string>();
    const uniqueChildren = new Map<string, { parent: string; child: string }>();

    input.categoryMap.forEach((hierarchy, childHandle) => {
      uniqueParents.add(hierarchy.parent);
      uniqueChildren.set(childHandle, hierarchy);
    });

    const categoryHandles = new Map<string, string>(existingHandles);

    // Cria categorias PAI que não existem
    const parentsToCreate = Array.from(uniqueParents).filter((parentHandle) => !categoryHandles.has(parentHandle));

    if (parentsToCreate.length > 0) {
      logger.info(`Criando ${parentsToCreate.length} categorias PAI...`);

      try {
        const { result: createdParents } = await createProductCategoriesWorkflow(container).run({
          input: {
            product_categories: parentsToCreate.map((handle) => ({
              name: handle
                .split('-')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' '),
              handle,
              is_active: true,
            })),
          },
        });

        if (Array.isArray(createdParents)) {
          for (const cat of createdParents as ProductCategoryDTO[]) {
            if (cat.handle && cat.id) {
              categoryHandles.set(cat.handle, cat.id);
              logger.info(`Categoria PAI criada: ${cat.name || ''} (${cat.handle})`);
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`Erro ao criar categorias pai: ${errorMessage}`);
        // Tenta criar uma por uma
        for (const handle of parentsToCreate) {
          try {
            const { result } = await createProductCategoriesWorkflow(container).run({
              input: {
                product_categories: [
                  {
                    name: handle
                      .split('-')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' '),
                    handle,
                    is_active: true,
                  },
                ],
              },
            });
            if (Array.isArray(result) && result.length > 0) {
              const cat = result[0] as ProductCategoryDTO;
              if (cat.handle && cat.id) {
                categoryHandles.set(cat.handle, cat.id);
              }
            }
          } catch (individualError) {
            const errorMessage = individualError instanceof Error ? individualError.message : String(individualError);
            if (!errorMessage.includes('already exists') && !errorMessage.includes('unique')) {
              logger.error(`Erro ao criar categoria pai ${handle}: ${errorMessage}`);
            }
          }
        }
      }
    }

    // Cria categorias FILHO com parent_category_id
    const childrenToCreate = Array.from(uniqueChildren.entries()).filter(
      ([childHandle]) => !categoryHandles.has(childHandle),
    );

    if (childrenToCreate.length > 0) {
      logger.info(`Criando ${childrenToCreate.length} categorias FILHO...`);

      for (const [childHandle, hierarchy] of childrenToCreate) {
        try {
          const parentId = categoryHandles.get(hierarchy.parent);

          const { result } = await createProductCategoriesWorkflow(container).run({
            input: {
              product_categories: [
                {
                  name: childHandle
                    .split('-')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' '),
                  handle: childHandle,
                  is_active: true,
                  parent_category_id: parentId,
                },
              ],
            },
          });

          if (Array.isArray(result) && result.length > 0) {
            const cat = result[0] as ProductCategoryDTO;
            if (cat.handle && cat.id) {
              categoryHandles.set(cat.handle, cat.id);
              logger.info(`Categoria FILHO criada: ${cat.name || ''} (${cat.handle})`);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes('already exists') && !errorMessage.includes('unique')) {
            logger.error(`Erro ao criar categoria filho ${childHandle}: ${errorMessage}`);
          }
        }
      }
    }

    return new StepResponse<EnsureCategoriesStepOutput>({
      categoryHandles,
    });
  },
);
