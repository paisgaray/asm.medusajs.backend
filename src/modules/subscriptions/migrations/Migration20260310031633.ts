import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260310031633 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "subscription_address" drop constraint if exists "subscription_address_subscription_id_foreign";`,
    );

    this.addSql(`drop index if exists "IDX_subscription_address_subscription_id_unique";`);
    this.addSql(`alter table if exists "subscription_address" drop column if exists "subscription_id";`);

    this.addSql(`alter table if exists "subscription" add column if not exists "address_id" text null;`);
    this.addSql(
      `alter table if exists "subscription" alter column "periodDate" type timestamptz using ("periodDate"::timestamptz);`,
    );
    this.addSql(`alter table if exists "subscription" alter column "periodDate" drop not null;`);
    this.addSql(
      `alter table if exists "subscription" add constraint "subscription_address_id_foreign" foreign key ("address_id") references "subscription_address" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_subscription_address_id" ON "subscription" ("address_id") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "subscription" drop constraint if exists "subscription_address_id_foreign";`);

    this.addSql(`drop index if exists "IDX_subscription_address_id";`);
    this.addSql(`alter table if exists "subscription" drop column if exists "address_id";`);

    this.addSql(
      `alter table if exists "subscription" alter column "periodDate" type timestamptz using ("periodDate"::timestamptz);`,
    );
    this.addSql(`alter table if exists "subscription" alter column "periodDate" set not null;`);

    this.addSql(`alter table if exists "subscription_address" add column if not exists "subscription_id" text null;`);
    this.addSql(
      `alter table if exists "subscription_address" add constraint "subscription_address_subscription_id_foreign" foreign key ("subscription_id") references "subscription" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_subscription_address_subscription_id_unique" ON "subscription_address" ("subscription_id") WHERE deleted_at IS NULL;`,
    );
  }
}
