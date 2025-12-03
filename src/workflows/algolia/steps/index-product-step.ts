import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

import { ALGOLIA_MODULE } from '../../../modules/algolia';
import AlgoliaModuleService from '../../../modules/algolia/service';

type IndexProductStepInput = {
  product_id: string;
};

export const indexProductStep = createStep(
  'index-product-step',
  async (input: IndexProductStepInput, { container }) => {
    const algoliaService: AlgoliaModuleService = container.resolve(ALGOLIA_MODULE);
    const productModuleService = container.resolve('product');

    // Retrieve product with relations
    const product = await productModuleService.retrieveProduct(input.product_id);

    // Format product data for Algolia
    const productData: Record<string, unknown> = {
      id: product.id,
      title: product.title || '',
      description: product.description || '',
      handle: product.handle || '',
      thumbnail: product.thumbnail || '',
    };

    // Add images if available
    if (product.images && Array.isArray(product.images)) {
      productData.images = product.images.map((img: { url?: string }) => img?.url || '');
    } else {
      productData.images = [];
    }

    // Add variants if available
    if (product.variants && Array.isArray(product.variants)) {
      productData.variants = product.variants.map((variant: { id?: string; title?: string }) => ({
        id: variant.id || '',
        title: variant.title || '',
      }));
    } else {
      productData.variants = [];
    }

    // Add categories if available
    if (product.categories && Array.isArray(product.categories)) {
      productData.categories = product.categories.map((cat: { id?: string; name?: string }) => ({
        id: cat.id || '',
        name: cat.name || '',
      }));
    } else {
      productData.categories = [];
    }

    await algoliaService.indexData([productData], 'product');

    return new StepResponse(productData);
  },
);

