ALTER TABLE "wholesale_applications" DROP CONSTRAINT "wholesale_applications_reviewed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "wholesale_applications" ADD CONSTRAINT "wholesale_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;