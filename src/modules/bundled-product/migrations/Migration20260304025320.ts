import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260304025320 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "custom_item_override" drop constraint if exists "custom_item_override_custom_item_id_unique";`,
    );
    this.addSql(
      `create table if not exists "custom_item" ("id" text not null, "type" text check ("type" in ('single', 'bundle')) not null default 'single', "product_snapshot" jsonb not null, "custom_bundle_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "custom_item_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_item_custom_bundle_id" ON "custom_item" ("custom_bundle_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_item_deleted_at" ON "custom_item" ("deleted_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `create table if not exists "custom_item_override" ("id" text not null, "delivery_date" timestamptz not null, "custom_bundle_id" text null, "custom_item_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "custom_item_override_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_item_override_custom_bundle_id" ON "custom_item_override" ("custom_bundle_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_custom_item_override_custom_item_id_unique" ON "custom_item_override" ("custom_item_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_item_override_deleted_at" ON "custom_item_override" ("deleted_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `alter table if exists "custom_item" add constraint "custom_item_custom_bundle_id_foreign" foreign key ("custom_bundle_id") references "custom_bundle" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table if exists "custom_item_override" add constraint "custom_item_override_custom_bundle_id_foreign" foreign key ("custom_bundle_id") references "custom_bundle" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table if exists "custom_item_override" add constraint "custom_item_override_custom_item_id_foreign" foreign key ("custom_item_id") references "custom_item" ("id") on update cascade;`,
    );

    this.addSql(`drop table if exists "custom_bundle_item" cascade;`);

    this.addSql(`alter table if exists "bundle_item" drop column if exists "quantity";`);
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "custom_item_override" drop constraint if exists "custom_item_override_custom_item_id_foreign";`,
    );

    this.addSql(
      `create table if not exists "custom_bundle_item" ("id" text not null, "type" text check ("type" in ('single', 'bundle')) not null default 'single', "quantity" integer not null default 1, "item_price" integer not null, "product_snapshot" jsonb not null, "custom_bundle_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "custom_bundle_item_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_bundle_item_custom_bundle_id" ON "custom_bundle_item" ("custom_bundle_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_bundle_item_deleted_at" ON "custom_bundle_item" ("deleted_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `alter table if exists "custom_bundle_item" add constraint "custom_bundle_item_custom_bundle_id_foreign" foreign key ("custom_bundle_id") references "custom_bundle" ("id") on update cascade on delete set null;`,
    );

    this.addSql(`drop table if exists "custom_item" cascade;`);

    this.addSql(`drop table if exists "custom_item_override" cascade;`);

    this.addSql(`alter table if exists "bundle_item" add column if not exists "quantity" integer not null default 1;`);
  }
}
