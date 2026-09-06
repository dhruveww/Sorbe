import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260906172330 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "store_wa_template" drop constraint if exists "store_wa_template_key_unique";`);
    this.addSql(`alter table if exists "store_customer_profile" drop constraint if exists "store_customer_profile_customer_id_unique";`);
    this.addSql(`create table if not exists "store_consent_log" ("id" text not null, "customer_id" text null, "phone" text null, "consent_type" text not null, "granted" boolean not null, "source" text null, "ip" text null, "user_agent" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_consent_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_consent_log_deleted_at" ON "store_consent_log" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_customer_profile" ("id" text not null, "customer_id" text not null, "whatsapp_opt_in" boolean not null default false, "whatsapp_opt_in_at" timestamptz null, "whatsapp_opt_in_source" text null, "marketing_opt_in" boolean not null default false, "preferred_language" text not null default 'en', "gstin" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_customer_profile_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_customer_profile_customer_id_unique" ON "store_customer_profile" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_customer_profile_deleted_at" ON "store_customer_profile" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_restock_alert" ("id" text not null, "phone" text not null, "variant_id" text not null, "product_id" text null, "status" text not null default 'pending', "notified_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_restock_alert_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_restock_alert_deleted_at" ON "store_restock_alert" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_wa_log" ("id" text not null, "customer_id" text null, "phone" text not null, "template_key" text not null, "variables" jsonb null, "status" text not null default 'would_send', "provider_message_id" text null, "error" text null, "order_id" text null, "subject_ref" text null, "triggered_by" text not null default 'system', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_wa_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_wa_log_deleted_at" ON "store_wa_log" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_wa_template" ("id" text not null, "key" text not null, "language" text not null default 'en', "category" text not null default 'utility', "body_text" text not null, "bsp_template_name" text null, "is_active" boolean not null default true, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_wa_template_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_wa_template_key_unique" ON "store_wa_template" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_wa_template_deleted_at" ON "store_wa_template" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "store_consent_log" cascade;`);

    this.addSql(`drop table if exists "store_customer_profile" cascade;`);

    this.addSql(`drop table if exists "store_restock_alert" cascade;`);

    this.addSql(`drop table if exists "store_wa_log" cascade;`);

    this.addSql(`drop table if exists "store_wa_template" cascade;`);
  }

}
