import { Migration } from '@mikro-orm/migrations';

export class Migration20260127000001 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "bundle" add column if not exists "subscription_price" numeric null;');
    this.addSql('alter table "bundle" add column if not exists "currency" text default \'usd\';');
  }

  async down(): Promise<void> {
    this.addSql('alter table "bundle" drop column if exists "subscription_price";');
    this.addSql('alter table "bundle" drop column if exists "currency";');
  }
}
