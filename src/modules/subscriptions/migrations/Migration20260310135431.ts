import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260310135431 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "subscription" alter column "currency" type text using ("currency"::text);`);
    this.addSql(`alter table if exists "subscription" alter column "currency" set default 'eur';`);
    this.addSql(`alter table if exists "subscription" rename column "periodDate" to "delivery_date";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "subscription" alter column "currency" type text using ("currency"::text);`);
    this.addSql(`alter table if exists "subscription" alter column "currency" set default 'usd';`);
    this.addSql(`alter table if exists "subscription" rename column "delivery_date" to "periodDate";`);
  }
}
