import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260218121356 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "bundle" drop column if exists "title";`);

    this.addSql(
      `alter table if exists "bundle" add column if not exists "subscription_price" numeric null, add column if not exists "currency" text not null default 'eur', add column if not exists "raw_subscription_price" jsonb null;`,
    );

    this.addSql(`alter table if exists "bundle_item" add column if not exists "details" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "bundle" drop column if exists "subscription_price", drop column if exists "currency", drop column if exists "raw_subscription_price";`,
    );

    this.addSql(`alter table if exists "bundle" add column if not exists "title" text not null;`);

    this.addSql(`alter table if exists "bundle_item" drop column if exists "details";`);
  }
}
