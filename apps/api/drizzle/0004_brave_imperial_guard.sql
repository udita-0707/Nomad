CREATE TABLE "destination_cities" (
	"name" text PRIMARY KEY NOT NULL,
	"country_code" text NOT NULL,
	"airports" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destination_countries" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY DEFAULT 'G-' || upper(substr(gen_random_uuid()::text, 1, 8)) NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"city" text NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"max_size" smallint NOT NULL,
	"budget_inr" integer NOT NULL,
	"itinerary" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_size_check" CHECK ("groups"."max_size" between 1 and 4),
	CONSTRAINT "groups_budget_check" CHECK ("groups"."budget_inr" > 0),
	CONSTRAINT "groups_dates_check" CHECK ("groups"."check_in" >= date '2027-04-01' and "groups"."check_out" <= date '2027-04-20' and "groups"."check_out" > "groups"."check_in"),
	CONSTRAINT "groups_name_check" CHECK (length(trim("groups"."name")) between 1 and 80)
);
--> statement-breakpoint
ALTER TABLE "destination_cities" ADD CONSTRAINT "destination_cities_country_code_destination_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."destination_countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_travellers_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."travellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_city_destination_cities_name_fk" FOREIGN KEY ("city") REFERENCES "public"."destination_cities"("name") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "destination_countries" ("code", "name", "timezone") VALUES
	('JP', 'Japan', 'Asia/Tokyo'),
	('AE', 'United Arab Emirates', 'Asia/Dubai')
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
INSERT INTO "destination_cities" ("name", "country_code", "airports") VALUES
	('Tokyo', 'JP', ARRAY['NRT', 'HND']),
	('Kyoto', 'JP', ARRAY['KIX']),
	('Osaka', 'JP', ARRAY['KIX']),
	('Dubai', 'AE', ARRAY['DXB']),
	('Abu Dhabi', 'AE', ARRAY['AUH', 'DXB'])
ON CONFLICT ("name") DO NOTHING;
