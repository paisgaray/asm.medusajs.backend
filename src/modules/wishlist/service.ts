import { MedusaService } from '@medusajs/framework/utils';

import Wishlist from './models/wishlist';
import WishlistItem from './models/wishlist-item';

type WishlistItemFilterInput = {
  product_variant_id?: string | null;
};

type UpdateWishlistData = {
  name?: string | null;
  share_token?: string;
};

class WishlistService extends MedusaService({
  Wishlist,
  WishlistItem,
}) {
  buildItemFilter(input: WishlistItemFilterInput): { product_variant_id?: string } {
    const variantId = input.product_variant_id ?? undefined;

    if (!variantId) {
      throw new Error('product_variant_id must be provided');
    }

    return { product_variant_id: variantId };
  }

  /**
   * Método customizado para atualizar uma wishlist por ID
   * Usa o repositório diretamente para garantir a atualização
   */
  async updateWishlistById(id: string, data: UpdateWishlistData): Promise<void> {
    // Acessa o repositório diretamente via __container__
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const manager = (this as any).__container__.manager;

    // Prepara os campos para atualização
    const setFields: string[] = [];
    const params: (string | null)[] = [];

    if (data.name !== undefined) {
      setFields.push(`"name" = ?`);
      params.push(data.name);
    }

    if (data.share_token !== undefined) {
      setFields.push(`"share_token" = ?`);
      params.push(data.share_token);
    }

    if (setFields.length === 0) {
      return;
    }

    // Adiciona updated_at
    setFields.push(`"updated_at" = NOW()`);

    // Adiciona o ID como último parâmetro
    params.push(id);

    const query = `UPDATE "wishlist" SET ${setFields.join(', ')} WHERE "id" = ?`;

    await manager.execute(query, params);
  }

  /**
   * Método customizado para atualizar um item da wishlist por ID
   * Usa SQL direto para garantir que a atualização seja persistida corretamente
   */
  async updateWishlistItemById(id: string, data: { quantity?: number }): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const manager = (this as any).__container__.manager;

    if (data.quantity === undefined) {
      return;
    }

    const query = `UPDATE "wishlist_item" SET "quantity" = ?, "updated_at" = NOW() WHERE "id" = ?`;
    await manager.execute(query, [data.quantity, id]);
  }
}

export default WishlistService;
