import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260102134050 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "region_zipcode" ("id" text not null, "zipcode" text not null, "region_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "region_zipcode_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_region_zipcode_deleted_at" ON "region_zipcode" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "region_zipcode" cascade;`);
  }
}
