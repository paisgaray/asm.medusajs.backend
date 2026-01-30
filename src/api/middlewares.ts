import { defineMiddlewares } from '@medusajs/framework/http';
import multer from 'multer';

import { bundledProductsMiddlewares } from './admin/bundled-products/middleware';
import { regionZipcodeMiddlewares } from './admin/region-zipcodes/middleware';
import { lineItemBundlesMiddlewares } from './store/carts/[id]/line-item-bundles/middleware';
import { newsletterMiddlewares } from './store/newsletter/middleware';
import { productSearchMiddlewares } from './store/products/search/middleware';
import { wishlistMiddlewares } from './store/wishlist/middleware';

const upload = multer({ storage: multer.memoryStorage() });

export default defineMiddlewares({
  routes: [
    ...bundledProductsMiddlewares,
    ...lineItemBundlesMiddlewares,
    ...productSearchMiddlewares,
    ...newsletterMiddlewares,
    ...wishlistMiddlewares,
    ...regionZipcodeMiddlewares,
    {
      matcher: '/admin/imports/disfruta',
      method: ['POST'],
      middlewares: [upload.single('file')],
    },
    // NOTA: Removido middleware multer para /admin/products/imports
    // O Admin UI envia arquivo via URL no body, não via multipart/form-data
    // Se necessário, podemos adicionar de volta para suportar ambos os formatos
  ],
});
