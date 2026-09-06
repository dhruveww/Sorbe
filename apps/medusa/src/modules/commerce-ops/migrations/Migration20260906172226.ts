import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260906172226 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "store_webhook_event" drop constraint if exists "store_webhook_event_event_id_unique";`);
    this.addSql(`alter table if exists "store_invoice" drop constraint if exists "store_invoice_invoice_number_unique";`);
    this.addSql(`alter table if exists "store_invoice" drop constraint if exists "store_invoice_order_id_unique";`);
    this.addSql(`create table if not exists "store_invoice" ("id" text not null, "order_id" text not null, "invoice_number" text not null, "series" text not null, "seller_gstin" text null, "buyer_gstin" text null, "place_of_supply_state_code" text null, "subtotal_paise" integer not null, "discount_paise" integer not null default 0, "shipping_paise" integer not null default 0, "taxable_value_paise" integer not null, "cgst_paise" integer not null default 0, "sgst_paise" integer not null default 0, "igst_paise" integer not null default 0, "total_paise" integer not null, "hsn_summary" jsonb null, "pdf_url" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_invoice_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_invoice_order_id_unique" ON "store_invoice" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_invoice_invoice_number_unique" ON "store_invoice" ("invoice_number") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_invoice_deleted_at" ON "store_invoice" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_order_state_log" ("id" text not null, "order_id" text not null, "state" text not null, "changed_by" text not null default 'system', "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_order_state_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_order_state_log_deleted_at" ON "store_order_state_log" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_webhook_event" ("id" text not null, "provider" text not null default 'razorpay', "event_id" text not null, "event_type" text null, "payload" jsonb null, "status" text not null default 'received', "error" text null, "processed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_webhook_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_webhook_event_event_id_unique" ON "store_webhook_event" ("event_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_webhook_event_deleted_at" ON "store_webhook_event" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "store_invoice" cascade;`);

    this.addSql(`drop table if exists "store_order_state_log" cascade;`);

    this.addSql(`drop table if exists "store_webhook_event" cascade;`);
  }

}
