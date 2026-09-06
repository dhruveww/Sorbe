import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260906165220 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "store_shipping_rate" ("id" text not null, "zone_id" text not null, "min_cart_value_paise" integer not null default 0, "fee_paise" integer not null, "free_above_paise" integer null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_shipping_rate_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_shipping_rate_deleted_at" ON "store_shipping_rate" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_shipping_zone" ("id" text not null, "name" text not null, "pincode_prefixes" jsonb not null, "eta_days_min" integer not null, "eta_days_max" integer not null, "cod_available" boolean not null default true, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_shipping_zone_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_shipping_zone_deleted_at" ON "store_shipping_zone" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "store_shipping_rate" cascade;`);

    this.addSql(`drop table if exists "store_shipping_zone" cascade;`);
  }

}
