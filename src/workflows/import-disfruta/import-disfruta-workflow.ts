import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { createProductsWorkflow } from '@medusajs/medusa/core-flows';

import { ensureCategoriesStep } from './steps/ensure-categories-step';
import type { TransformedProduct } from './steps/transform-excel-step';
import { transformDisfrutaExcelStep } from './steps/transform-excel-step';

type ImportDisfrutaCatalogInput = {
  filePath: string;
  salesChannelId?: string;
  shippingProfileId?: string;
};

/**
 * Remove a propriedade category_handle de um produto transformado
 */
function omitCategoryHandle(product: TransformedProduct): Omit<TransformedProduct, 'category_handle'> {
  const productEntries = Object.entries(product) as Array<[keyof TransformedProduct, unknown]>;
  const filteredEntries = productEntries.filter(([key]) => key !== 'category_handle');
  return Object.fromEntries(filteredEntries) as Omit<TransformedProduct, 'category_handle'>;
}

export const importDisfrutaCatalogWorkflow = createWorkflow(
  'import-disfruta-catalog',
  (input: ImportDisfrutaCatalogInput) => {
    // Passo 1: Transformar Excel em produtos formatados
    const transformResult = transformDisfrutaExcelStep(input);

    // Passo 2: Garantir que categorias existem
    const categoryMapData = transform({ transformResult }, (data) => {
      return data.transformResult?.categoryMap || new Map();
    });

    const categoriesResult = ensureCategoriesStep({
      categoryMap: categoryMapData,
    });

    // Passo 3: Mapear category_handle para category_id nos produtos
    const productsWithCategoryIds = transform({ transformResult, categoriesResult }, (data) => {
      const products = data.transformResult?.products || [];
      const categoryHandles = data.categoriesResult?.categoryHandles || new Map();

      if (!Array.isArray(products)) {
        return [];
      }

      return products.map((product: TransformedProduct) => {
        if (product?.category_handle && categoryHandles.has(product.category_handle)) {
          const categoryId = categoryHandles.get(product.category_handle);
          if (!categoryId) {
            return omitCategoryHandle(product);
          }
          return {
            ...omitCategoryHandle(product),
            category_ids: [categoryId],
          };
        }
        return omitCategoryHandle(product);
      });
    });

    // Passo 4: Criar produtos usando workflow oficial
    const createdProducts = createProductsWorkflow.runAsStep({
      input: {
        products: productsWithCategoryIds,
      },
    });

    return new WorkflowResponse(
      transform({ transformResult, createdProducts }, (data) => ({
        products: data.createdProducts || [],
        total: Array.isArray(data.transformResult?.products) ? data.transformResult.products.length : 0,
      })),
    );
  },
);
