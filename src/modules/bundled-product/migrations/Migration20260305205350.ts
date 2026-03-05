import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260305205350 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`drop index if exists "IDX_custom_item_override_custom_item_id_unique";`);

    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_custom_item_override_custom_item_id" ON "custom_item_override" ("custom_item_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_custom_item_override_custom_item_id";`);

    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_custom_item_override_custom_item_id_unique" ON "custom_item_override" ("custom_item_id") WHERE deleted_at IS NULL;`);
  }

}
