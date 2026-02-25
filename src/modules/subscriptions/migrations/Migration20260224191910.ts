import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260224191910 extends Migration {
  override async up(): Promise<void> {
    // Drop old foreign keys before renaming (safe regardless)
    this.addSql(
      `alter table if exists "subscription_item" drop constraint if exists "subscription_item_bundle_id_foreign";`,
    );
    this.addSql(
      `alter table if exists "subscription_item" drop constraint if exists "subscription_item_subscription_id_foreign";`,
    );
    this.addSql(
      `alter table if exists "subscription_bundle" drop constraint if exists "subscription_bundle_subscription_id_foreign";`,
    );

    // Conditionally rename tables only if subscription_bundle exists (may have been created fresh as custom_bundle already)
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription_bundle')
           AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'custom_bundle') THEN
          ALTER TABLE "subscription_bundle" RENAME TO "custom_bundle";
        END IF;
      END $$;
    `);
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription_item')
           AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'custom_bundle_item') THEN
          ALTER TABLE "subscription_item" RENAME TO "custom_bundle_item";
        END IF;
      END $$;
    `);

    // Rename primary key constraints (only if they still have the old name on the target table)
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
          WHERE c.conname = 'subscription_bundle_pkey' AND t.relname = 'custom_bundle'
        ) THEN
          ALTER TABLE "custom_bundle" RENAME CONSTRAINT "subscription_bundle_pkey" TO "custom_bundle_pkey";
        END IF;
      END $$;
    `);
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
          WHERE c.conname = 'subscription_item_pkey' AND t.relname = 'custom_bundle_item'
        ) THEN
          ALTER TABLE "custom_bundle_item" RENAME CONSTRAINT "subscription_item_pkey" TO "custom_bundle_item_pkey";
        END IF;
      END $$;
    `);

    // Rename indexes on custom_bundle
    this.addSql(
      `ALTER INDEX IF EXISTS "IDX_subscription_bundle_subscription_id" RENAME TO "IDX_custom_bundle_subscription_id";`,
    );
    this.addSql(`ALTER INDEX IF EXISTS "IDX_subscription_bundle_deleted_at" RENAME TO "IDX_custom_bundle_deleted_at";`);

    // Rename indexes on custom_bundle_item
    this.addSql(
      `ALTER INDEX IF EXISTS "IDX_subscription_item_subscription_id" RENAME TO "IDX_custom_bundle_item_subscription_id";`,
    );
    this.addSql(
      `ALTER INDEX IF EXISTS "IDX_subscription_item_bundle_id" RENAME TO "IDX_custom_bundle_item_bundle_id";`,
    );
    this.addSql(
      `ALTER INDEX IF EXISTS "IDX_subscription_item_deleted_at" RENAME TO "IDX_custom_bundle_item_deleted_at";`,
    );

    // Drop subscription_id FK and column (association now managed via link table)
    this.addSql(`DROP INDEX IF EXISTS "IDX_custom_bundle_subscription_id";`);
    this.addSql(`alter table if exists "custom_bundle" drop column if exists "subscription_id";`);
    this.addSql(`DROP INDEX IF EXISTS "IDX_custom_bundle_item_subscription_id";`);
    this.addSql(`alter table if exists "custom_bundle_item" drop column if exists "subscription_id";`);
  }

  override async down(): Promise<void> {
    // Drop new foreign keys
    this.addSql(
      `alter table if exists "custom_bundle_item" drop constraint if exists "custom_bundle_item_bundle_id_foreign";`,
    );

    // Restore subscription_id columns before renaming back
    this.addSql(`alter table "custom_bundle" add column if not exists "subscription_id" text not null default '';`);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_bundle_subscription_id" ON "custom_bundle" ("subscription_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `alter table "custom_bundle_item" add column if not exists "subscription_id" text not null default '';`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_bundle_item_subscription_id" ON "custom_bundle_item" ("subscription_id") WHERE deleted_at IS NULL;`,
    );

    // Rename tables back
    this.addSql(`alter table if exists "custom_bundle" rename to "subscription_bundle";`);
    this.addSql(`alter table if exists "custom_bundle_item" rename to "subscription_item";`);

    // Rename primary key constraints back
    this.addSql(
      `alter table "subscription_bundle" rename constraint "custom_bundle_pkey" to "subscription_bundle_pkey";`,
    );
    this.addSql(
      `alter table "subscription_item" rename constraint "custom_bundle_item_pkey" to "subscription_item_pkey";`,
    );

    // Rename indexes back
    this.addSql(
      `ALTER INDEX IF EXISTS "IDX_custom_bundle_subscription_id" RENAME TO "IDX_subscription_bundle_subscription_id";`,
    );
    this.addSql(`ALTER INDEX IF EXISTS "IDX_custom_bundle_deleted_at" RENAME TO "IDX_subscription_bundle_deleted_at";`);
    this.addSql(
      `ALTER INDEX IF EXISTS "IDX_custom_bundle_item_subscription_id" RENAME TO "IDX_subscription_item_subscription_id";`,
    );
    this.addSql(
      `ALTER INDEX IF EXISTS "IDX_custom_bundle_item_bundle_id" RENAME TO "IDX_subscription_item_bundle_id";`,
    );
    this.addSql(
      `ALTER INDEX IF EXISTS "IDX_custom_bundle_item_deleted_at" RENAME TO "IDX_subscription_item_deleted_at";`,
    );

    // Recreate old foreign keys
    this.addSql(
      `alter table "subscription_bundle" add constraint "subscription_bundle_subscription_id_foreign" foreign key ("subscription_id") references "subscription" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "subscription_item" add constraint "subscription_item_subscription_id_foreign" foreign key ("subscription_id") references "subscription" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "subscription_item" add constraint "subscription_item_bundle_id_foreign" foreign key ("bundle_id") references "subscription_bundle" ("id") on update cascade on delete set null;`,
    );
  }
}
