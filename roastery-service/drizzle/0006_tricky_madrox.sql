CREATE TYPE "public"."promo_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TABLE "prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid,
	"product_id" uuid,
	"price" integer NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prices_variant_or_product_xor" CHECK (("prices"."variant_id" is null) <> ("prices"."product_id" is null))
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"type" "promo_type" NOT NULL,
	"value" integer NOT NULL,
	"min_order" integer,
	"max_discount" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "wholesale_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"min_quantity" integer NOT NULL,
	"discount_percent" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_variant_id_bean_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."bean_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "prices_variant_id_unique" ON "prices" USING btree ("variant_id") WHERE "prices"."variant_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "prices_product_id_unique" ON "prices" USING btree ("product_id") WHERE "prices"."product_id" is not null;