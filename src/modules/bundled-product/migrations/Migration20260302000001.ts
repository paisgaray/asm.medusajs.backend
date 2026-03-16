import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260302000001 extends Migration {
  override async up(): Promise<void> {
    // Rename table custom_bundle_item → custom_item (if not already renamed)
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'custom_bundle_item')
           AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'custom_item') THEN
          ALTER TABLE "custom_bundle_item" RENAME TO "custom_item";
        END IF;
      END $$;
    `);

    // Rename primary key constraint
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
          WHERE c.conname = 'custom_bundle_item_pkey' AND t.relname = 'custom_item'
        ) THEN
          ALTER TABLE "custom_item" RENAME CONSTRAINT "custom_bundle_item_pkey" TO "custom_item_pkey";
        END IF;
      END $$;
    `);

    // Rename bundle FK constraint
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
          WHERE c.conname = 'custom_bundle_item_bundle_id_foreign' AND t.relname = 'custom_item'
        ) THEN
          ALTER TABLE "custom_item"
            RENAME CONSTRAINT "custom_bundle_item_bundle_id_foreign" TO "custom_item_bundle_id_foreign";
        END IF;
      END $$;
    `);

    // Rename indexes
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'IDX_custom_bundle_item_bundle_id')
           AND NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'IDX_custom_item_bundle_id') THEN
          ALTER INDEX "IDX_custom_bundle_item_bundle_id" RENAME TO "IDX_custom_item_bundle_id";
        END IF;
      END $$;
    `);
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'IDX_custom_bundle_item_deleted_at')
           AND NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'IDX_custom_item_deleted_at') THEN
          ALTER INDEX "IDX_custom_bundle_item_deleted_at" RENAME TO "IDX_custom_item_deleted_at";
        END IF;
      END $$;
    `);
  }

  override async down(): Promise<void> {
    // Rename table back
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'custom_item')
           AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'custom_bundle_item') THEN
          ALTER TABLE "custom_item" RENAME TO "custom_bundle_item";
        END IF;
      END $$;
    `);
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
          WHERE c.conname = 'custom_item_pkey' AND t.relname = 'custom_bundle_item'
        ) THEN
          ALTER TABLE "custom_bundle_item" RENAME CONSTRAINT "custom_item_pkey" TO "custom_bundle_item_pkey";
        END IF;
      END $$;
    `);
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'IDX_custom_item_bundle_id')
           AND NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'IDX_custom_bundle_item_bundle_id') THEN
          ALTER INDEX "IDX_custom_item_bundle_id" RENAME TO "IDX_custom_bundle_item_bundle_id";
        END IF;
      END $$;
    `);
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'IDX_custom_item_deleted_at')
           AND NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'IDX_custom_bundle_item_deleted_at') THEN
          ALTER INDEX "IDX_custom_item_deleted_at" RENAME TO "IDX_custom_bundle_item_deleted_at";
        END IF;
      END $$;
    `);
  }
}
