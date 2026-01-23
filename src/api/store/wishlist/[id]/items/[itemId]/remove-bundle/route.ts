// BUNDLES NÃO SÃO PERMITIDOS NA WISHLIST
// Esta rota foi desabilitada pois bundles não podem ser adicionados à wishlist

// import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

// import { removeWishlistBundleWorkflow } from '../../../../../../../workflows/wishlist';
// import type { StoreWishlistRetrieveQuery } from '../../../../validators';

// export async function DELETE(
//   req: MedusaRequest<undefined, StoreWishlistRetrieveQuery>,
//   res: MedusaResponse,
// ): Promise<void> {
//   const { result } = await removeWishlistBundleWorkflow(req.scope).run({
//     input: {
//       wishlist_id: req.params.id as string,
//       item_id: req.params.itemId as string,
//     },
//   });

//   res.json({
//     bundle_id: result.bundle_id,
//     deleted: result.result.deleted,
//     object: result.result.object,
//     item_id: result.result.id,
//     message: 'Bundle removed from wishlist',
//   });
// }
