import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { randomBytes } from "crypto"
import { WISHLIST_MODULE } from "../../../../../modules/wishlist"
import WishlistService from "../../../../../modules/wishlist/service"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const wishlistService: WishlistService = req.scope.resolve(WISHLIST_MODULE)
  const wishlistId = req.params.id as string
  const customerId = req.query.customer_id as string | undefined

  if (customerId) {
    const wishlist = await wishlistService.retrieveWishlist(wishlistId)
    if (wishlist.customer_id !== customerId) {
      res.status(403).json({ message: "Access denied" })
      return
    }
  }

  try {
    const shareToken = randomBytes(32).toString("hex")
    const currentWishlist = await wishlistService.retrieveWishlist(wishlistId)
    const items = await wishlistService.listWishlistItems({
      wishlist_id: wishlistId,
    })

    await wishlistService.deleteWishlists(wishlistId)

    const newWishlist = await wishlistService.createWishlists({
      customer_id: currentWishlist.customer_id,
      share_token: shareToken,
    })

    for (const item of items) {
      await wishlistService.createWishlistItems({
        wishlist_id: newWishlist.id,
        product_id: item.product_id,
        product_variant_id: item.product_variant_id || undefined,
        quantity: item.quantity,
      })
    }

    const finalWishlist = await wishlistService.retrieveWishlist(newWishlist.id)
    const finalItems = await wishlistService.listWishlistItems({
      wishlist_id: newWishlist.id,
    })

    res.json({
      share_token: shareToken,
      share_url: `${req.protocol}://${req.get("host")}/store/wishlists/shared/${shareToken}`,
      wishlist_id: finalWishlist.id,
      wishlist: {
        ...finalWishlist,
        items: finalItems,
      },
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to share wishlist",
      error: error?.message || String(error),
    })
  }
}
