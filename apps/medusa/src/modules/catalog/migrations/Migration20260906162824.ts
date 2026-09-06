import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260906162824 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "store_product_seo" drop constraint if exists "store_product_seo_product_id_unique";`);
    this.addSql(`alter table if exists "store_product_extra" drop constraint if exists "store_product_extra_product_id_unique";`);
    this.addSql(`alter table if exists "store_collection_seo" drop constraint if exists "store_collection_seo_collection_id_unique";`);
    this.addSql(`create table if not exists "store_collection_seo" ("id" text not null, "collection_id" text not null, "meta_title" text null, "meta_description" text null, "canonical_url" text null, "og_image_url" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_collection_seo_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_collection_seo_collection_id_unique" ON "store_collection_seo" ("collection_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_collection_seo_deleted_at" ON "store_collection_seo" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_product_extra" ("id" text not null, "product_id" text not null, "is_handmade" boolean not null default false, "handmade_lead_time_days" integer null, "country_of_origin" text not null default 'India', "manufacturer_name" text null, "manufacturer_address" text null, "hsn_code" text null, "gst_rate_percent" integer null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_product_extra_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_product_extra_product_id_unique" ON "store_product_extra" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_product_extra_deleted_at" ON "store_product_extra" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_product_seo" ("id" text not null, "product_id" text not null, "meta_title" text null, "meta_description" text null, "canonical_url" text null, "og_image_url" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_product_seo_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_product_seo_product_id_unique" ON "store_product_seo" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_product_seo_deleted_at" ON "store_product_seo" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "store_collection_seo" cascade;`);

    this.addSql(`drop table if exists "store_product_extra" cascade;`);

    this.addSql(`drop table if exists "store_product_seo" cascade;`);
  }

}
