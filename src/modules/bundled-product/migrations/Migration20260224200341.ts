import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260224200341 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "custom_bundle" ("id" text not null, "bundle_price" integer not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "custom_bundle_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_bundle_deleted_at" ON "custom_bundle" ("deleted_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `create table if not exists "custom_bundle_item" ("id" text not null, "type" text check ("type" in ('single', 'bundle')) not null default 'single', "quantity" integer not null default 1, "item_price" integer not null, "product_snapshot" jsonb not null, "bundle_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "custom_bundle_item_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_bundle_item_bundle_id" ON "custom_bundle_item" ("bundle_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_bundle_item_deleted_at" ON "custom_bundle_item" ("deleted_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `alter table if exists "custom_bundle_item" drop constraint if exists "custom_bundle_item_bundle_id_foreign";`,
    );
    this.addSql(
      `alter table if exists "custom_bundle_item" add constraint "custom_bundle_item_bundle_id_foreign" foreign key ("bundle_id") references "custom_bundle" ("id") on update cascade on delete set null;`,
    );

    // Drop subscription_id if it still exists (leftover from before refactor)
    this.addSql(`alter table if exists "custom_bundle" drop column if exists "subscription_id";`);
    this.addSql(`alter table if exists "custom_bundle_item" drop column if exists "subscription_id";`);
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "custom_bundle_item" drop constraint if exists "custom_bundle_item_bundle_id_foreign";`,
    );

    this.addSql(`drop table if exists "custom_bundle" cascade;`);

    this.addSql(`drop table if exists "custom_bundle_item" cascade;`);
  }
}
