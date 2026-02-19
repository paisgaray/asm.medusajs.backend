import { defineMiddlewares, MedusaNextFunction, MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import multer from 'multer';

import { bundledProductsMiddlewares } from './admin/bundled-products/middleware';
import { contactAdminMiddlewares } from './admin/contact/middleware';
import { regionZipcodeMiddlewares } from './admin/region-zipcodes/middleware';
import { lineItemBundlesMiddlewares } from './store/carts/[id]/line-item-bundles/middleware';
import { contactStoreMiddlewares } from './store/contact/middleware';
import { newsletterMiddlewares } from './store/newsletter/middleware';
import { paymentMethodsMiddlewares } from './store/payment-methods/middleware';
import { productSearchMiddlewares } from './store/products/search/middleware';
import { wishlistMiddlewares } from './store/wishlist/middleware';

const upload = multer({ storage: multer.memoryStorage() });

// Trust proxy: só em produção, atrás de CloudFront/ALB (X-Forwarded-Proto, etc.)
let trustProxySet = false;
function trustProxyMiddleware(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction): void {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  if (!trustProxySet) {
    const app = (req as unknown as { app?: { set: (k: string, v: number) => void } }).app;
    if (app?.set) {
      app.set('trust proxy', 1);
      trustProxySet = true;
    }
  }
  next();
}

export default defineMiddlewares({
  routes: [
    { matcher: '/*', method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], middlewares: [trustProxyMiddleware] },
    ...bundledProductsMiddlewares,
    ...lineItemBundlesMiddlewares,
    ...productSearchMiddlewares,
    ...newsletterMiddlewares,
    ...wishlistMiddlewares,
    ...regionZipcodeMiddlewares,
    ...contactAdminMiddlewares,
    ...contactStoreMiddlewares,
    {
      matcher: '/admin/imports/disfruta',
      method: ['POST'],
      middlewares: [upload.single('file')],
    },
    // NOTA: Removido middleware multer para /admin/products/imports
    // O Admin UI envia arquivo via URL no body, não via multipart/form-data
    // Se necessário, podemos adicionar de volta para suportar ambos os formatos
    ...paymentMethodsMiddlewares,
  ],
});
