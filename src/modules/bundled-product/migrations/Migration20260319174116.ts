import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260319174116 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "custom_item" add column if not exists "quantity" integer not null default 1;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "custom_item" drop column if exists "quantity";`);
  }
}
