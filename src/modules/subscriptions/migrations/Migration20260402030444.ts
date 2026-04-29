import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260402030444 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "subscription_invoice" ("id" text not null, "current_subscription_billing_date" timestamptz not null, "billing_date" timestamptz not null, "amount" integer not null, "subscription_id" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "subscription_invoice_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_subscription_invoice_subscription_id" ON "subscription_invoice" ("subscription_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_subscription_invoice_deleted_at" ON "subscription_invoice" ("deleted_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `alter table if exists "subscription_invoice" add constraint "subscription_invoice_subscription_id_foreign" foreign key ("subscription_id") references "subscription" ("id") on update cascade;`,
    );

    this.addSql(`alter table if exists "subscription" drop column if exists "provider";`);

    this.addSql(
      `alter table if exists "subscription" add column if not exists "provider_id" text check ("provider_id" in ('pp_stripe_stripe', 'pp_global-payments_global-payments')) null;`,
    );
    this.addSql(
      `alter table if exists "subscription" alter column "provider_subscription_id" type text using ("provider_subscription_id"::text);`,
    );
    this.addSql(`alter table if exists "subscription" alter column "provider_subscription_id" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "subscription_invoice" cascade;`);

    this.addSql(`alter table if exists "subscription" drop column if exists "provider_id";`);

    this.addSql(`alter table if exists "subscription" add column if not exists "provider" text not null;`);
    this.addSql(
      `alter table if exists "subscription" alter column "provider_subscription_id" type text using ("provider_subscription_id"::text);`,
    );
    this.addSql(`alter table if exists "subscription" alter column "provider_subscription_id" set not null;`);
  }
}
