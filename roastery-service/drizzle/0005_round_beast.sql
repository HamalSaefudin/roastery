CREATE TYPE "public"."movement_reason" AS ENUM('purchase', 'sale', 'adjustment', 'return', 'reserve', 'release');--> statement-breakpoint
CREATE TYPE "public"."unit_status" AS ENUM('in_stock', 'reserved', 'sold', 'defective');--> statement-breakpoint
CREATE TABLE "bean_stock" (
	"variant_id" uuid PRIMARY KEY NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"serial_number" text NOT NULL,
	"status" "unit_status" DEFAULT 'in_stock' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_units_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid,
	"unit_id" uuid,
	"change" integer NOT NULL,
	"reason" "movement_reason" NOT NULL,
	"ref_order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bean_stock" ADD CONSTRAINT "bean_stock_variant_id_bean_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."bean_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_units" ADD CONSTRAINT "equipment_units_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_bean_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."bean_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_unit_id_equipment_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."equipment_units"("id") ON DELETE set null ON UPDATE no action;