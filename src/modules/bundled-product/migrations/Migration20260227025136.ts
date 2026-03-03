import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260227025136 extends Migration {
  override async up(): Promise<void> {
    // This migration renames bundle_id -> custom_bundle_id on the custom_bundle_item table.
    // In some environments Migration20260302000001 (which renames custom_bundle_item -> custom_item)
    // may have already been applied, so we detect the actual table name at runtime.
    this.addSql(`
      DO $$ DECLARE
        tbl text;
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'custom_bundle_item') THEN
          tbl := 'custom_bundle_item';
        ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'custom_item') THEN
          tbl := 'custom_item';
        ELSE
          tbl := NULL;
        END IF;

        IF tbl IS NOT NULL THEN
          -- Drop old FK
          EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS custom_bundle_item_bundle_id_foreign', tbl);

          -- Drop old index
          DROP INDEX IF EXISTS "IDX_custom_bundle_item_bundle_id";

          -- Rename column only if it hasn't been renamed yet
          IF EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = tbl AND column_name = 'bundle_id'
          ) THEN
            EXECUTE format('ALTER TABLE %I RENAME COLUMN bundle_id TO custom_bundle_id', tbl);
          END IF;

          -- Add new FK if not already present
          IF NOT EXISTS (
            SELECT FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = tbl AND c.conname = 'custom_bundle_item_custom_bundle_id_foreign'
          ) THEN
            EXECUTE format(
              'ALTER TABLE %I ADD CONSTRAINT custom_bundle_item_custom_bundle_id_foreign FOREIGN KEY (custom_bundle_id) REFERENCES custom_bundle (id) ON UPDATE CASCADE ON DELETE SET NULL',
              tbl
            );
          END IF;

          -- Create new index if not already present
          IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'IDX_custom_bundle_item_custom_bundle_id') THEN
            EXECUTE format(
              'CREATE INDEX "IDX_custom_bundle_item_custom_bundle_id" ON %I (custom_bundle_id) WHERE deleted_at IS NULL',
              tbl
            );
          END IF;
        END IF;
      END $$;
    `);

    this.addSql(`alter table if exists "custom_bundle" add column if not exists "bundle_id" text not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`
      DO $$ DECLARE
        tbl text;
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'custom_bundle_item') THEN
          tbl := 'custom_bundle_item';
        ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'custom_item') THEN
          tbl := 'custom_item';
        ELSE
          tbl := NULL;
        END IF;

        IF tbl IS NOT NULL THEN
          EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS custom_bundle_item_custom_bundle_id_foreign', tbl);

          DROP INDEX IF EXISTS "IDX_custom_bundle_item_custom_bundle_id";

          IF EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = tbl AND column_name = 'custom_bundle_id'
          ) THEN
            EXECUTE format('ALTER TABLE %I RENAME COLUMN custom_bundle_id TO bundle_id', tbl);
          END IF;

          IF NOT EXISTS (
            SELECT FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = tbl AND c.conname = 'custom_bundle_item_bundle_id_foreign'
          ) THEN
            EXECUTE format(
              'ALTER TABLE %I ADD CONSTRAINT custom_bundle_item_bundle_id_foreign FOREIGN KEY (bundle_id) REFERENCES custom_bundle (id) ON UPDATE CASCADE ON DELETE SET NULL',
              tbl
            );
          END IF;

          IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'IDX_custom_bundle_item_bundle_id') THEN
            EXECUTE format(
              'CREATE INDEX "IDX_custom_bundle_item_bundle_id" ON %I (bundle_id) WHERE deleted_at IS NULL',
              tbl
            );
          END IF;
        END IF;
      END $$;
    `);

    this.addSql(`alter table if exists "custom_bundle" drop column if exists "bundle_id";`);
  }
}
