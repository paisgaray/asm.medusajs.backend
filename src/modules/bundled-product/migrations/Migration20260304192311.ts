import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260304192311 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "custom_bundle" drop column if exists "bundle_price";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "custom_bundle" add column if not exists "bundle_price" integer not null;`);
  }
}
