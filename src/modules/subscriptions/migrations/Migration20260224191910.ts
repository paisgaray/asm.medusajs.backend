import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260224191910 extends Migration {
  override async up(): Promise<void> {
    // Drop old foreign keys before renaming
    this.addSql(
      `alter table if exists "subscription_item" drop constraint if exists "subscription_item_bundle_id_foreign";`,
    );
    this.addSql(
      `alter table if exists "subscription_item" drop constraint if exists "subscription_item_subscription_id_foreign";`,
    );
    this.addSql(
      `alter table if exists "subscription_bundle" drop constraint if exists "subscription_bundle_subscription_id_foreign";`,
    );

    // Rename tables (preserves data)
    this.addSql(`alter table if exists "subscription_bundle" rename to "custom_bundle";`);
    this.addSql(`alter table if exists "subscription_item" rename to "custom_bundle_item";`);

    // Rename primary key constraints
    this.addSql(`alter table "custom_bundle" rename constraint "subscription_bundle_pkey" to "custom_bundle_pkey";`);
    this.addSql(
      `alter table "custom_bundle_item" rename constraint "subscription_item_pkey" to "custom_bundle_item_pkey";`,
    );

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

    // Recreate foreign keys with new names
    this.addSql(
      `alter table "custom_bundle" add constraint "custom_bundle_subscription_id_foreign" foreign key ("subscription_id") references "subscription" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "custom_bundle_item" add constraint "custom_bundle_item_subscription_id_foreign" foreign key ("subscription_id") references "subscription" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "custom_bundle_item" add constraint "custom_bundle_item_bundle_id_foreign" foreign key ("bundle_id") references "custom_bundle" ("id") on update cascade on delete set null;`,
    );
  }

  override async down(): Promise<void> {
    // Drop new foreign keys
    this.addSql(
      `alter table if exists "custom_bundle_item" drop constraint if exists "custom_bundle_item_bundle_id_foreign";`,
    );
    this.addSql(
      `alter table if exists "custom_bundle_item" drop constraint if exists "custom_bundle_item_subscription_id_foreign";`,
    );
    this.addSql(
      `alter table if exists "custom_bundle" drop constraint if exists "custom_bundle_subscription_id_foreign";`,
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
