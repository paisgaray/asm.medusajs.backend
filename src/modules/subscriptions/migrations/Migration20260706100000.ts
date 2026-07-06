import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260706100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      delete from "auth_identity"
      where "app_metadata" is not null
        and "app_metadata" ? 'customer_id'
        and "app_metadata"->'customer_id' = 'null'::jsonb;
    `);
  }

  override async down(): Promise<void> {
    // Irreversible data cleanup migration.
  }
}
