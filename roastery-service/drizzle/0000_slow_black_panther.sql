CREATE TYPE "public"."regency_type" AS ENUM('kota', 'kabupaten');--> statement-breakpoint
CREATE TABLE "districts" (
	"code" text PRIMARY KEY NOT NULL,
	"regency_code" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regencies" (
	"code" text PRIMARY KEY NOT NULL,
	"province_code" text NOT NULL,
	"name" text NOT NULL,
	"type" "regency_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "villages" (
	"code" text PRIMARY KEY NOT NULL,
	"district_code" text NOT NULL,
	"name" text NOT NULL,
	"postal_code" text
);
--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_regency_code_regencies_code_fk" FOREIGN KEY ("regency_code") REFERENCES "public"."regencies"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regencies" ADD CONSTRAINT "regencies_province_code_provinces_code_fk" FOREIGN KEY ("province_code") REFERENCES "public"."provinces"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "villages" ADD CONSTRAINT "villages_district_code_districts_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."districts"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "districts_regency_code_idx" ON "districts" USING btree ("regency_code");--> statement-breakpoint
CREATE INDEX "regencies_province_code_idx" ON "regencies" USING btree ("province_code");--> statement-breakpoint
CREATE INDEX "villages_district_code_idx" ON "villages" USING btree ("district_code");