import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260227025136 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "custom_bundle_item" drop constraint if exists "custom_bundle_item_bundle_id_foreign";`,
    );

    this.addSql(`alter table if exists "custom_bundle" add column if not exists "bundle_id" text not null;`);

    this.addSql(`drop index if exists "IDX_custom_bundle_item_bundle_id";`);

    this.addSql(`alter table if exists "custom_bundle_item" rename column "bundle_id" to "custom_bundle_id";`);
    this.addSql(
      `alter table if exists "custom_bundle_item" add constraint "custom_bundle_item_custom_bundle_id_foreign" foreign key ("custom_bundle_id") references "custom_bundle" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_bundle_item_custom_bundle_id" ON "custom_bundle_item" ("custom_bundle_id") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "custom_bundle_item" drop constraint if exists "custom_bundle_item_custom_bundle_id_foreign";`,
    );

    this.addSql(`alter table if exists "custom_bundle" drop column if exists "bundle_id";`);

    this.addSql(`drop index if exists "IDX_custom_bundle_item_custom_bundle_id";`);

    this.addSql(`alter table if exists "custom_bundle_item" rename column "custom_bundle_id" to "bundle_id";`);
    this.addSql(
      `alter table if exists "custom_bundle_item" add constraint "custom_bundle_item_bundle_id_foreign" foreign key ("bundle_id") references "custom_bundle" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_bundle_item_bundle_id" ON "custom_bundle_item" ("bundle_id") WHERE deleted_at IS NULL;`,
    );
  }
}
