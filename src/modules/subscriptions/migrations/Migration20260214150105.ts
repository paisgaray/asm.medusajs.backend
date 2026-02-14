import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260214150105 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "subscription" (
        "id" text not null, 
        "customer_id" text not null, 
        "bundle_product_id" text not null, 
        "provider" text not null, 
        "provider_subscription_id" text not null, 
        "provider_customer_id" text not null, 
        "status" text not null default 'active', 
        "subscription_price" integer not null, 
        "currency" text not null default 'usd', 
        "metadata" jsonb null, 
        "created_at" timestamptz not null default now(), 
        "updated_at" timestamptz not null default now(), 
        "deleted_at" timestamptz null, 
        constraint "subscription_pkey" primary key ("id"));
      `,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_subscription_deleted_at" ON "subscription" ("deleted_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `create table if not exists "subscription_item" ("id" text not null, "product_id" text not null, "variant_id" text not null, "quantity" integer not null default 1, "product_snapshot" jsonb not null, "subscription_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "subscription_item_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_subscription_item_subscription_id" ON "subscription_item" ("subscription_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_subscription_item_deleted_at" ON "subscription_item" ("deleted_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'subscription_item_subscription_id_foreign'
        ) THEN
          ALTER TABLE "subscription_item" 
          ADD CONSTRAINT "subscription_item_subscription_id_foreign" 
          FOREIGN KEY ("subscription_id") 
          REFERENCES "subscription" ("id") 
          ON UPDATE CASCADE;
        END IF;
      END $$;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "subscription_item" drop constraint if exists "subscription_item_subscription_id_foreign";`,
    );

    this.addSql(`drop table if exists "subscription" cascade;`);

    this.addSql(`drop table if exists "subscription_item" cascade;`);
  }
}
