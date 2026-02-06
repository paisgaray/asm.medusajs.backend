import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260202113619 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "contact" drop constraint if exists "contact_email_unique";`);
    this.addSql(
      `create table if not exists "contact" ("id" text not null, "first_name" text not null, "last_name" text not null, "email" text not null, "phone" text not null, "subject" text not null, "message" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "contact_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_contact_email_unique" ON "contact" ("email") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_contact_deleted_at" ON "contact" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "contact" cascade;`);
  }
}
