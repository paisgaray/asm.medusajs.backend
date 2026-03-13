import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260310031149 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "subscription_address" drop constraint if exists "subscription_address_subscription_id_unique";`,
    );

    this.addSql(
      `create table if not exists "subscription_address" ("id" text not null, "first_name" text not null, "last_name" text not null, "address_1" text not null, "address_2" text not null, "city" text not null, "country_code" text not null, "province" text not null, "postal_code" text not null, "metadata" jsonb null, "subscription_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "subscription_address_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_subscription_address_subscription_id_unique" ON "subscription_address" ("subscription_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_subscription_address_deleted_at" ON "subscription_address" ("deleted_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `alter table if exists "subscription_address" add constraint "subscription_address_subscription_id_foreign" foreign key ("subscription_id") references "subscription" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table if exists "subscription" add column if not exists "periodDate" timestamptz not null, add column if not exists "period" text check ("period" in ('morning', 'afternoon', 'evening')) null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "subscription_address" cascade;`);

    this.addSql(
      `alter table if exists "subscription" drop column if exists "periodDate", drop column if exists "period";`,
    );
  }
}
