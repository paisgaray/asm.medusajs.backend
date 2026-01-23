import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20251110154642 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "bundle" add column if not exists "details" text null;`);

    this.addSql(`alter table if exists "bundle_item" add column if not exists "details" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "bundle" drop column if exists "details";`);

    this.addSql(`alter table if exists "bundle_item" drop column if exists "details";`);
  }
}
