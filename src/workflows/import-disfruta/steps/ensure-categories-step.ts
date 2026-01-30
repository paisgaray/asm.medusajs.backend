import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createProductCategoriesWorkflow } from '@medusajs/medusa/core-flows';

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
    
    existingCategories.forEach((cat: any) => {
      existingHandles.set(cat.handle, cat.id);
    });

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
    const parentsToCreate = Array.from(uniqueParents).filter(
      parentHandle => !categoryHandles.has(parentHandle)
    );

    if (parentsToCreate.length > 0) {
      logger.info(`Criando ${parentsToCreate.length} categorias PAI...`);
      
      try {
        const { result: createdParents } = await createProductCategoriesWorkflow(container).run({
          input: {
            product_categories: parentsToCreate.map(handle => ({
              name: handle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              handle,
              is_active: true,
            })),
          },
        });

        createdParents.forEach((cat: any) => {
          categoryHandles.set(cat.handle, cat.id);
          logger.info(`Categoria PAI criada: ${cat.name} (${cat.handle})`);
        });
      } catch (error: any) {
        logger.warn(`Erro ao criar categorias pai: ${error.message}`);
        // Tenta criar uma por uma
        for (const handle of parentsToCreate) {
          try {
            const { result } = await createProductCategoriesWorkflow(container).run({
              input: {
                product_categories: [{
                  name: handle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                  handle,
                  is_active: true,
                }],
              },
            });
            const cat = result[0];
            categoryHandles.set(cat.handle, cat.id);
          } catch (individualError: any) {
            if (!individualError.message?.includes('already exists') && 
                !individualError.message?.includes('unique')) {
              logger.error(`Erro ao criar categoria pai ${handle}: ${individualError.message}`);
            }
          }
        }
      }
    }

    // Cria categorias FILHO com parent_category_id
    const childrenToCreate = Array.from(uniqueChildren.entries()).filter(
      ([childHandle]) => !categoryHandles.has(childHandle)
    );

    if (childrenToCreate.length > 0) {
      logger.info(`Criando ${childrenToCreate.length} categorias FILHO...`);
      
      for (const [childHandle, hierarchy] of childrenToCreate) {
        try {
          const parentId = categoryHandles.get(hierarchy.parent);
          
          const { result } = await createProductCategoriesWorkflow(container).run({
            input: {
              product_categories: [{
                name: childHandle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                handle: childHandle,
                is_active: true,
                parent_category_id: parentId,
              }],
            },
          });

          const cat = result[0];
          categoryHandles.set(cat.handle, cat.id);
          logger.info(`Categoria FILHO criada: ${cat.name} (${cat.handle})`);
        } catch (error: any) {
          if (!error.message?.includes('already exists') && 
              !error.message?.includes('unique')) {
            logger.error(`Erro ao criar categoria filho ${childHandle}: ${error.message}`);
          }
        }
      }
    }

    return new StepResponse<EnsureCategoriesStepOutput>({
      categoryHandles,
    });
  }
);
