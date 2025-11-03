import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WISHLIST_MODULE } from "../../../../../../modules/wishlist"
import WishlistService from "../../../../../../modules/wishlist/service"

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE)
  const wishlistId = req.params.id as string
  const itemId = req.params.itemId as string
  const customerId = req.query.customer_id as string | undefined

  try {
    const item = await wishlistService.retrieveWishlistItem(itemId)
    
    if (item.wishlist_id !== wishlistId) {
      res.status(404).json({ message: "Item not found in this wishlist" })
      return
    }

    if (customerId) {
      try {
        const wishlist = await wishlistService.retrieveWishlist(item.wishlist_id)
        if (wishlist.customer_id !== customerId) {
          res.status(403).json({ message: "Access denied" })
          return
        }
      } catch (error: any) {
        if (error?.message?.includes("not found")) {
          res.status(404).json({ message: "Wishlist not found" })
          return
        }
        throw error
      }
    }

    await wishlistService.deleteWishlistItems(itemId)

    res.json({
      id: itemId,
      object: "wishlist_item",
      deleted: true,
    })
  } catch (error: any) {
    if (error?.message?.includes("not found")) {
      res.status(404).json({ message: "Item not found" })
      return
    }
    throw error
  }
}
