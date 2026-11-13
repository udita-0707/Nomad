CREATE TABLE "travellers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"age" integer,
	"gender" text NOT NULL,
	"home_city" text NOT NULL,
	"interests" text[] NOT NULL,
	"gender_preference" text DEFAULT 'ANY' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "travellers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
-- Keep profiles saved before this migration.
INSERT INTO "travellers" ("id", "user_id", "name", "gender", "home_city", "interests", "gender_preference", "updated_at")
SELECT gen_random_uuid()::text, "user_id", "name", "gender", "home_city", "interests", "gender_preference", "updated_at" FROM "profiles";--> statement-breakpoint
DROP TABLE "profiles" CASCADE;--> statement-breakpoint
ALTER TABLE "travellers" ADD CONSTRAINT "travellers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;