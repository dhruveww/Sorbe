import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260906172436 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "store_cms_content" drop constraint if exists "store_cms_content_section_unique";`);
    this.addSql(`create table if not exists "store_cms_content" ("id" text not null, "section" text not null, "title" text null, "body_html" text not null, "locale" text not null default 'en', "is_published" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_cms_content_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_cms_content_section_unique" ON "store_cms_content" ("section") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_cms_content_deleted_at" ON "store_cms_content" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_faq_item" ("id" text not null, "category" text not null default 'orders', "question" text not null, "answer_html" text not null, "sort_order" integer not null default 0, "is_published" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_faq_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_faq_item_deleted_at" ON "store_faq_item" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_manual_recommendation" ("id" text not null, "source_product_id" text not null, "related_product_id" text not null, "relation_type" text not null default 'more_like_this', "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_manual_recommendation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_manual_recommendation_deleted_at" ON "store_manual_recommendation" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_popup" ("id" text not null, "title" text not null, "image_url" text null, "body_text" text null, "cta_label" text null, "cta_url" text null, "is_active" boolean not null default false, "starts_at" timestamptz null, "ends_at" timestamptz null, "display_mode" text not null default 'once_per_session', "priority" integer not null default 0, "created_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_popup_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_popup_deleted_at" ON "store_popup" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_reel" ("id" text not null, "product_id" text not null, "instagram_url" text not null, "cover_image_url" text null, "caption" text null, "rights_status" text not null default 'pending', "sort_order" integer not null default 0, "is_published" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_reel_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_reel_deleted_at" ON "store_reel" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "store_cms_content" cascade;`);

    this.addSql(`drop table if exists "store_faq_item" cascade;`);

    this.addSql(`drop table if exists "store_manual_recommendation" cascade;`);

    this.addSql(`drop table if exists "store_popup" cascade;`);

    this.addSql(`drop table if exists "store_reel" cascade;`);
  }

}
