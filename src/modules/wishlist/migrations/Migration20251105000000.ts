import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20251105000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE IF EXISTS "wishlist_item" ADD COLUMN IF NOT EXISTS "bundle_id" text null;`);
    this.addSql(`ALTER TABLE IF EXISTS "wishlist_item" ALTER COLUMN "product_id" DROP NOT NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wishlist_item_bundle_id" ON "wishlist_item" (bundle_id);`);
    this.addSql(
      `ALTER TABLE "wishlist_item" DROP CONSTRAINT IF EXISTS "CHK_wishlist_item_exclusive";`,
    );
    this.addSql(
      `ALTER TABLE "wishlist_item" ADD CONSTRAINT "CHK_wishlist_item_exclusive" CHECK (
        (bundle_id IS NULL AND product_variant_id IS NOT NULL) OR
        (bundle_id IS NOT NULL AND product_variant_id IS NULL)
      );`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_wishlist_item_bundle_id";`);
    this.addSql(`ALTER TABLE IF EXISTS "wishlist_item" DROP CONSTRAINT IF EXISTS "CHK_wishlist_item_exclusive";`);
    this.addSql(`ALTER TABLE IF EXISTS "wishlist_item" DROP COLUMN IF EXISTS "bundle_id";`);
    this.addSql(`ALTER TABLE IF EXISTS "wishlist_item" ALTER COLUMN "product_id" SET NOT NULL;`);
  }
}
