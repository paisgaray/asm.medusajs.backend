"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20260319001839 = void 0;
const migrations_1 = require("@medusajs/framework/mikro-orm/migrations");
class Migration20260319001839 extends migrations_1.Migration {
    async up() {
        this.addSql(`create table if not exists "payment_payments_tokenizations" ("id" text not null, "customer_id" text not null, "provider" text not null, "card_token" text not null, "brand" text not null, "exp_month" text not null, "exp_year" text not null, "last4" text not null, "is_active" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "payment_payments_tokenizations_pkey" primary key ("id"));`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payment_payments_tokenizations_customer_id" ON "payment_payments_tokenizations" ("customer_id") WHERE deleted_at IS NULL;`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payment_payments_tokenizations_deleted_at" ON "payment_payments_tokenizations" ("deleted_at") WHERE deleted_at IS NULL;`);
    }
    async down() {
        this.addSql(`drop table if exists "payment_payments_tokenizations" cascade;`);
    }
}
exports.Migration20260319001839 = Migration20260319001839;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNjAzMTkwMDE4MzkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9wYXltZW50cy9taWdyYXRpb25zL01pZ3JhdGlvbjIwMjYwMzE5MDAxODM5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHlFQUFxRTtBQUVyRSxNQUFhLHVCQUF3QixTQUFRLHNCQUFTO0lBRTNDLEtBQUssQ0FBQyxFQUFFO1FBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQywyZkFBMmYsQ0FBQyxDQUFDO1FBQ3pnQixJQUFJLENBQUMsTUFBTSxDQUFDLDJKQUEySixDQUFDLENBQUM7UUFDekssSUFBSSxDQUFDLE1BQU0sQ0FBQyx5SkFBeUosQ0FBQyxDQUFDO0lBQ3pLLENBQUM7SUFFUSxLQUFLLENBQUMsSUFBSTtRQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLGdFQUFnRSxDQUFDLENBQUM7SUFDaEYsQ0FBQztDQUVGO0FBWkQsMERBWUMifQ==