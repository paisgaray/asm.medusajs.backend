import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260223120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "subscription"
        add column if not exists "current_period_start" timestamptz null,
        add column if not exists "next_billing_date" timestamptz null,
        add column if not exists "provider_payment_method_id" text null,
        add column if not exists "payment_last4" text null,
        add column if not exists "payment_brand" text null,
        add column if not exists "payment_exp_month" integer null,
        add column if not exists "payment_exp_year" integer null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "subscription"
        drop column if exists "current_period_start",
        drop column if exists "next_billing_date",
        drop column if exists "provider_payment_method_id",
        drop column if exists "payment_last4",
        drop column if exists "payment_brand",
        drop column if exists "payment_exp_month",
        drop column if exists "payment_exp_year";`,
    );
  }
}
