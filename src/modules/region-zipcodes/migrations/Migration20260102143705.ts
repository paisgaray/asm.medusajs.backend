import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260102143705 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_region_zipcode_region_id" ON "region_zipcode" ("region_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_region_zipcode_zipcode" ON "region_zipcode" ("zipcode") WHERE deleted_at IS NULL;`,
    );

    // Add foreign key constraint to ensure region_id references a valid region
    this.addSql(
      `ALTER TABLE "region_zipcode" ADD CONSTRAINT "FK_region_zipcode_region_id" FOREIGN KEY ("region_id") REFERENCES "region"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
    );
  }

  override async down(): Promise<void> {
    // Drop foreign key constraint first
    this.addSql(`ALTER TABLE "region_zipcode" DROP CONSTRAINT IF EXISTS "FK_region_zipcode_region_id";`);

    this.addSql(`drop index if exists "IDX_region_zipcode_region_id";`);
    this.addSql(`drop index if exists "IDX_region_zipcode_zipcode";`);
  }
}
