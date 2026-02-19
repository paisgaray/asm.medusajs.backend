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

// Trust proxy: só em produção. CloudFront -> ALB -> app = 2 proxies; valor configurável via TRUST_PROXY_SETTING
const trustProxyValue = (() => {
  const raw = process.env.TRUST_PROXY_SETTING ?? '2';
  const n = parseInt(raw, 10);
  if (!Number.isNaN(n) && n >= 0) return n;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return 2;
})();
let trustProxySet = false;
function trustProxyMiddleware(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction): void {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  if (!trustProxySet) {
    const app = (req as unknown as { app?: { set: (k: string, v: number | boolean) => void } }).app;
    if (app?.set) {
      app.set('trust proxy', trustProxyValue);
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
