import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260220192539 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "subscription_bundle" (
        "id" text not null, 
        "bundle_price" integer not null, 
        "metadata" jsonb null, 
        "subscription_id" text not null, 
        "created_at" timestamptz not null default now(), 
        "updated_at" timestamptz not null default now(), 
        "deleted_at" timestamptz null, 
        constraint "subscription_bundle_pkey" primary key ("id")
      );`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_subscription_bundle_subscription_id" ON "subscription_bundle" ("subscription_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_subscription_bundle_deleted_at" ON "subscription_bundle" ("deleted_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `alter table if exists "subscription_bundle" add constraint "subscription_bundle_subscription_id_foreign" foreign key ("subscription_id") references "subscription" ("id") on update cascade;`,
    );

    this.addSql(
      `alter table if exists "subscription" drop column if exists "customer_id", drop column if exists "bundle_product_id";`,
    );

    this.addSql(
      `alter table if exists "subscription_item" drop column if exists "product_id", drop column if exists "variant_id";`,
    );

    this.addSql(
      `alter table if exists "subscription_item" add column if not exists "type" text check ("type" in ('single', 'bundle')) not null default 'single', add column if not exists "item_price" integer not null default 0, add column if not exists "bundle_id" text null;`,
    );
    this.addSql(
      `alter table if exists "subscription_item" add constraint "subscription_item_bundle_id_foreign" foreign key ("bundle_id") references "subscription_bundle" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_subscription_item_bundle_id" ON "subscription_item" ("bundle_id") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "subscription_item" drop constraint if exists "subscription_item_bundle_id_foreign";`,
    );

    this.addSql(`drop table if exists "subscription_bundle" cascade;`);

    this.addSql(
      `alter table if exists "subscription" add column if not exists "customer_id" text not null, add column if not exists "bundle_product_id" text not null;`,
    );

    this.addSql(`drop index if exists "IDX_subscription_item_bundle_id";`);
    this.addSql(
      `alter table if exists "subscription_item" drop column if exists "type", drop column if exists "item_price", drop column if exists "bundle_id";`,
    );

    this.addSql(
      `alter table if exists "subscription_item" add column if not exists "product_id" text not null, add column if not exists "variant_id" text not null;`,
    );
  }
}
