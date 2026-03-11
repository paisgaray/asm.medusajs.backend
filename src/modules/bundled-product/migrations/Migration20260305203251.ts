import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260305203251 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "custom_item_override" rename column "delivery_date" to "expire_date";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "custom_item_override" rename column "expire_date" to "delivery_date";`);
  }
}
