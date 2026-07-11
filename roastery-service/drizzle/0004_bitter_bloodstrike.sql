CREATE TYPE "public"."product_type" AS ENUM('bean', 'machine', 'grinder');--> statement-breakpoint
CREATE TYPE "public"."bean_fulfillment" AS ENUM('ready_stock', 'roast_to_order');--> statement-breakpoint
CREATE TYPE "public"."bean_process" AS ENUM('washed', 'natural', 'honey', 'other');--> statement-breakpoint
CREATE TYPE "public"."grind_type" AS ENUM('whole', 'espresso', 'v60', 'french_press', 'moka_pot', 'drip');--> statement-breakpoint
CREATE TYPE "public"."roast_level" AS ENUM('light', 'medium', 'dark');--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "origins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"region" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "product_type" NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"brand_id" uuid,
	"category_id" uuid,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_code_unique" UNIQUE("code"),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bean_details" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"origin_id" uuid,
	"process" "bean_process" NOT NULL,
	"roast_level" "roast_level" NOT NULL,
	"fulfillment_type" "bean_fulfillment" DEFAULT 'ready_stock' NOT NULL,
	"altitude" text,
	"variety" text,
	"tasting_notes" text,
	"roasted_at" date
);
--> statement-breakpoint
CREATE TABLE "bean_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"weight_grams" integer NOT NULL,
	"grind" "grind_type" DEFAULT 'whole' NOT NULL,
	"sku" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "bean_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "machine_details" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"specs" jsonb,
	"voltage" text,
	"warranty_months" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grinder_details" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"burr_type" text NOT NULL,
	"specs" jsonb,
	"warranty_months" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bean_details" ADD CONSTRAINT "bean_details_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bean_details" ADD CONSTRAINT "bean_details_origin_id_origins_id_fk" FOREIGN KEY ("origin_id") REFERENCES "public"."origins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bean_variants" ADD CONSTRAINT "bean_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_details" ADD CONSTRAINT "machine_details_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grinder_details" ADD CONSTRAINT "grinder_details_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;