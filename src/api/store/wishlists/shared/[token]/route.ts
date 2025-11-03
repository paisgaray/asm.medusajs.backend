import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WISHLIST_MODULE } from "../../../../../modules/wishlist"
import WishlistService from "../../../../../modules/wishlist/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE)
  const shareToken = req.params.token as string

  const allWishlists = await wishlistService.listWishlists({})
  const wishlists = allWishlists.filter((w) => w.share_token === shareToken)

  if (wishlists.length === 0) {
    res.status(404).json({ message: "Wishlist not found" })
    return
  }

  const wishlist = wishlists[0]
  const items = await wishlistService.listWishlistItems({
    wishlist_id: wishlist.id,
  })

  res.json({
    wishlist: {
      ...wishlist,
      items,
    },
  })
}
