import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20251124165734 extends Migration {
  override async up(): Promise<void> {
    // Adiciona índice único no share_token para garantir unicidade
    // Apenas wishlists com share_token não vazio precisam ser únicas
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wishlist_share_token_unique" ON "wishlist" (share_token) WHERE share_token != '' AND share_token IS NOT NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_wishlist_share_token_unique";`);
  }
}
