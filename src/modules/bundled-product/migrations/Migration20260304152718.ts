import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260304152718 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "custom_item" drop column if exists "quantity", drop column if exists "item_price";`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "custom_item" add column if not exists "quantity" integer not null default 1, add column if not exists "item_price" integer not null;`,
    );
  }
}
