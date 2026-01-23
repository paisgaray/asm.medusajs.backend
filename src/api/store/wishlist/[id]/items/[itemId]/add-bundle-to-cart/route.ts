// BUNDLES NÃO SÃO PERMITIDOS NA WISHLIST
// Esta rota foi desabilitada pois bundles não podem ser adicionados à wishlist

// import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

// import { addWishlistBundleToCartWorkflow } from '../../../../../../../workflows/wishlist';
// import type { WishlistBundleAddToCartBody } from '../../../../validators';

// export async function POST(req: MedusaRequest<WishlistBundleAddToCartBody>, res: MedusaResponse): Promise<void> {
//   const body = req.validatedBody as WishlistBundleAddToCartBody;

//   const { result } = await addWishlistBundleToCartWorkflow(req.scope).run({
//     input: {
//       wishlist_id: req.params.id as string,
//       item_id: req.params.itemId as string,
//       cart_id: body.cart_id,
//       region_id: req.query.region_id as string | undefined,
//       items: body.items?.map((override) => ({
//         item_id: override.item_id,
//         variant_id: override.variant_id,
//       })),
//     },
//   });

//   res.json(result);
// }
