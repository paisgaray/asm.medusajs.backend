import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260319193550 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "custom_bundle" add column if not exists "item_price" integer not null default 0;`);

    this.addSql(`alter table if exists "custom_item" add column if not exists "item_price" integer not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "custom_bundle" drop column if exists "item_price";`);

    this.addSql(`alter table if exists "custom_item" drop column if exists "item_price";`);
  }

}
