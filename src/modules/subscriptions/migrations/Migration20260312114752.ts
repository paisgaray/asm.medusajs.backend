import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260312114752 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "subscription_address" drop column if exists "province";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "subscription_address" add column if not exists "province" text not null;`);
  }
}
