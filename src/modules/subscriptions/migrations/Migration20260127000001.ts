import { Migration } from '@mikro-orm/migrations';

export class Migration20260127000001 extends Migration {
  async up(): Promise<void> {
    // Create subscription table
    this.addSql(`
      create table if not exists "subscription" (
        "id" text not null,
        "customer_id" text not null,
        "bundle_product_id" text not null,
        "provider" text not null,
        "provider_subscription_id" text not null,
        "provider_customer_id" text not null,
        "status" text not null default 'active',
        "subscription_price" numeric not null,
        "currency" text not null default 'usd',
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "subscription_pkey" primary key ("id")
      );
    `);

    // Create subscription_item table
    this.addSql(`
      create table if not exists "subscription_item" (
        "id" text not null,
        "subscription_id" text not null,
        "product_id" text not null,
        "variant_id" text not null,
        "quantity" integer not null default 1,
        "product_snapshot" jsonb not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "subscription_item_pkey" primary key ("id")
      );
    `);

    // Add foreign key
    this.addSql(`
      alter table "subscription_item" 
      add constraint "subscription_item_subscription_id_foreign" 
      foreign key ("subscription_id") references "subscription" ("id") 
      on update cascade on delete cascade;
    `);

    // Create indexes
    this.addSql('create index "subscription_customer_id_index" on "subscription" ("customer_id");');
    this.addSql('create index "subscription_status_index" on "subscription" ("status");');
    this.addSql(
      'create index "subscription_provider_subscription_id_index" on "subscription" ("provider_subscription_id");',
    );
    this.addSql('create index "subscription_item_subscription_id_index" on "subscription_item" ("subscription_id");');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "subscription_item" cascade;');
    this.addSql('drop table if exists "subscription" cascade;');
  }
}
