CREATE TABLE "availability" (
	"room_id" text NOT NULL,
	"date" date NOT NULL,
	"rooms_left" smallint NOT NULL,
	CONSTRAINT "availability_room_id_date_pk" PRIMARY KEY("room_id","date"),
	CONSTRAINT "availability_date_check" CHECK ("availability"."date" BETWEEN '2027-04-01' AND '2027-04-20'),
	CONSTRAINT "availability_rooms_left_check" CHECK ("availability"."rooms_left" >= 0)
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY DEFAULT 'BK-' || upper(substr(gen_random_uuid()::text, 1, 8)) NOT NULL,
	"group_id" text NOT NULL,
	"saved_option_id" uuid,
	"booked_by" text NOT NULL,
	"hotel_id" text NOT NULL,
	"room_id" text NOT NULL,
	"rooms_count" smallint NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"nights" smallint NOT NULL,
	"members_count" smallint NOT NULL,
	"total_inr" integer NOT NULL,
	"per_member_inr" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_group_id_unique" UNIQUE("group_id"),
	CONSTRAINT "bookings_counts_check" CHECK ("bookings"."rooms_count" > 0 AND "bookings"."members_count" > 0),
	CONSTRAINT "bookings_nights_check" CHECK ("bookings"."nights" = "bookings"."check_out" - "bookings"."check_in"),
	CONSTRAINT "bookings_total_check" CHECK ("bookings"."total_inr" > 0),
	CONSTRAINT "bookings_split_check" CHECK ("bookings"."per_member_inr" = round("bookings"."total_inr"::numeric / "bookings"."members_count", 2))
);
--> statement-breakpoint
CREATE TABLE "departure_cities" (
	"airport" text PRIMARY KEY NOT NULL,
	"city" text NOT NULL,
	CONSTRAINT "departure_cities_city_unique" UNIQUE("city")
);
--> statement-breakpoint
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
CREATE TABLE "group_memberships" (
	"group_id" text NOT NULL,
	"traveller_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"search_id" uuid,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "group_memberships_group_id_traveller_id_pk" PRIMARY KEY("group_id","traveller_id"),
	CONSTRAINT "memberships_status_check" CHECK ("group_memberships"."status" IN ('pending', 'approved', 'rejected')),
	CONSTRAINT "memberships_decided_check" CHECK (("group_memberships"."status" = 'pending') = ("group_memberships"."decided_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY DEFAULT 'G-' || substr(gen_random_uuid()::text, 1, 8) NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"city" text NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"max_size" smallint NOT NULL,
	"budget_inr" integer NOT NULL,
	"itinerary" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_name_check" CHECK (length(trim("groups"."name")) BETWEEN 1 AND 80),
	CONSTRAINT "groups_max_size_check" CHECK ("groups"."max_size" BETWEEN 2 AND 4),
	CONSTRAINT "groups_budget_check" CHECK ("groups"."budget_inr" > 0),
	CONSTRAINT "groups_dates_check" CHECK ("groups"."check_in" >= '2027-04-01' AND "groups"."check_out" <= '2027-04-20' AND "groups"."check_out" > "groups"."check_in")
);
--> statement-breakpoint
CREATE TABLE "hotels" (
	"hotel_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"city" text NOT NULL,
	"area" text NOT NULL,
	"lat" numeric(9, 6) NOT NULL,
	"lng" numeric(9, 6) NOT NULL,
	"rating" numeric(3, 1) NOT NULL,
	"stars" smallint NOT NULL,
	"check_in_from" time NOT NULL,
	"check_out_until" time NOT NULL,
	"family_friendly" boolean NOT NULL,
	"image" text,
	CONSTRAINT "hotels_rating_check" CHECK ("hotels"."rating" BETWEEN 0 AND 10),
	CONSTRAINT "hotels_stars_check" CHECK ("hotels"."stars" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "interests" (
	"interest" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"category" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"room_id" text PRIMARY KEY NOT NULL,
	"hotel_id" text NOT NULL,
	"room_type" text NOT NULL,
	"name" text NOT NULL,
	"max_adults" smallint NOT NULL,
	"max_children" smallint NOT NULL,
	"price_per_night_amount" integer NOT NULL,
	"price_per_night_currency" text DEFAULT 'INR' NOT NULL,
	"refundable" boolean NOT NULL,
	CONSTRAINT "rooms_room_id_hotel_id_unique" UNIQUE("room_id","hotel_id"),
	CONSTRAINT "rooms_max_adults_check" CHECK ("rooms"."max_adults" > 0),
	CONSTRAINT "rooms_max_children_check" CHECK ("rooms"."max_children" >= 0),
	CONSTRAINT "rooms_price_check" CHECK ("rooms"."price_per_night_amount" > 0),
	CONSTRAINT "rooms_currency_check" CHECK ("rooms"."price_per_night_currency" = 'INR')
);
--> statement-breakpoint
CREATE TABLE "saved_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" text NOT NULL,
	"saved_by" text NOT NULL,
	"hotel_id" text NOT NULL,
	"room_id" text NOT NULL,
	"rooms_count" smallint NOT NULL,
	"nights" smallint NOT NULL,
	"members_count" smallint NOT NULL,
	"total_inr" integer NOT NULL,
	"per_member_inr" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_options_group_member_room_unique" UNIQUE("group_id","saved_by","room_id"),
	CONSTRAINT "saved_options_counts_check" CHECK ("saved_options"."rooms_count" > 0 AND "saved_options"."nights" > 0 AND "saved_options"."members_count" > 0),
	CONSTRAINT "saved_options_cost_check" CHECK ("saved_options"."total_inr" > 0 AND "saved_options"."per_member_inr" > 0)
);
--> statement-breakpoint
CREATE TABLE "searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"traveller_id" text NOT NULL,
	"home_city" text NOT NULL,
	"city" text NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"budget_inr" integer NOT NULL,
	"interests" text[] NOT NULL,
	"gender" text NOT NULL,
	"gender_preference" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "searches_budget_check" CHECK ("searches"."budget_inr" > 0),
	CONSTRAINT "searches_interests_check" CHECK (cardinality("searches"."interests") >= 1),
	CONSTRAINT "searches_gender_check" CHECK ("searches"."gender" IN ('FEMALE', 'MALE')),
	CONSTRAINT "searches_gender_preference_check" CHECK ("searches"."gender_preference" IN ('ANY', 'SAME_GENDER')),
	CONSTRAINT "searches_dates_check" CHECK ("searches"."check_in" >= '2027-04-01' AND "searches"."check_out" <= '2027-04-20' AND "searches"."check_out" > "searches"."check_in")
);
--> statement-breakpoint
-- Reference data from the data pack (small and fixed). Loaded here so the
-- travellers.home_city foreign key holds for rows that already exist.
INSERT INTO "destination_countries" VALUES ('JP', 'Japan', 'Asia/Tokyo'), ('AE', 'United Arab Emirates', 'Asia/Dubai') ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "destination_cities" VALUES ('Tokyo', 'JP', ARRAY['NRT','HND']::text[]), ('Kyoto', 'JP', ARRAY['KIX']::text[]), ('Osaka', 'JP', ARRAY['KIX']::text[]), ('Dubai', 'AE', ARRAY['DXB']::text[]), ('Abu Dhabi', 'AE', ARRAY['AUH','DXB']::text[]) ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "departure_cities" VALUES ('BLR', 'Bengaluru'), ('DEL', 'Delhi'), ('BOM', 'Mumbai'), ('MAA', 'Chennai') ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "interests" VALUES ('TEMPLES', 'Temples and shrines', 'CULTURE'), ('MUSEUMS', 'Museums and galleries', 'CULTURE'), ('HISTORY', 'History and old towns', 'CULTURE'), ('STREET_FOOD', 'Street food and markets', 'FOOD'), ('FINE_DINING', 'Fine dining', 'FOOD'), ('NIGHTLIFE', 'Nightlife', 'SOCIAL'), ('SHOPPING', 'Shopping', 'SOCIAL'), ('PHOTOGRAPHY', 'Photography', 'HOBBY'), ('HIKING', 'Hiking', 'NATURE'), ('NATURE', 'Parks and gardens', 'NATURE'), ('BEACHES', 'Beaches', 'NATURE'), ('DESERT', 'Desert trips', 'NATURE'), ('ADVENTURE', 'Adventure sports', 'ACTIVITY'), ('THEME_PARKS', 'Theme parks', 'ACTIVITY'), ('BUDGET_STAYS', 'Budget stays', 'STYLE'), ('LUXURY', 'Luxury stays', 'STYLE') ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "travellers" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;--> statement-breakpoint
ALTER TABLE "travellers" ALTER COLUMN "age" SET DATA TYPE smallint;--> statement-breakpoint
ALTER TABLE "travellers" ADD COLUMN "home_airport" text;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_room_id_rooms_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("room_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_saved_option_id_saved_options_id_fk" FOREIGN KEY ("saved_option_id") REFERENCES "public"."saved_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_booked_by_travellers_id_fk" FOREIGN KEY ("booked_by") REFERENCES "public"."travellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotel_id_hotels_hotel_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("hotel_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_hotel_fk" FOREIGN KEY ("room_id","hotel_id") REFERENCES "public"."rooms"("room_id","hotel_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_cities" ADD CONSTRAINT "destination_cities_country_code_destination_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."destination_countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_traveller_id_travellers_id_fk" FOREIGN KEY ("traveller_id") REFERENCES "public"."travellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_travellers_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."travellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_city_destination_cities_name_fk" FOREIGN KEY ("city") REFERENCES "public"."destination_cities"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_city_destination_cities_name_fk" FOREIGN KEY ("city") REFERENCES "public"."destination_cities"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hotel_id_hotels_hotel_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("hotel_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_options" ADD CONSTRAINT "saved_options_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_options" ADD CONSTRAINT "saved_options_saved_by_travellers_id_fk" FOREIGN KEY ("saved_by") REFERENCES "public"."travellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_options" ADD CONSTRAINT "saved_options_hotel_id_hotels_hotel_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("hotel_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_options" ADD CONSTRAINT "saved_options_room_hotel_fk" FOREIGN KEY ("room_id","hotel_id") REFERENCES "public"."rooms"("room_id","hotel_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "searches" ADD CONSTRAINT "searches_traveller_id_travellers_id_fk" FOREIGN KEY ("traveller_id") REFERENCES "public"."travellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "searches" ADD CONSTRAINT "searches_home_city_departure_cities_city_fk" FOREIGN KEY ("home_city") REFERENCES "public"."departure_cities"("city") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "searches" ADD CONSTRAINT "searches_city_destination_cities_name_fk" FOREIGN KEY ("city") REFERENCES "public"."destination_cities"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memberships_approved_idx" ON "group_memberships" USING btree ("group_id") WHERE "group_memberships"."status" = 'approved';--> statement-breakpoint
CREATE INDEX "memberships_pending_idx" ON "group_memberships" USING btree ("group_id") WHERE "group_memberships"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "memberships_traveller_idx" ON "group_memberships" USING btree ("traveller_id");--> statement-breakpoint
CREATE INDEX "groups_city_dates_idx" ON "groups" USING btree ("city","check_in","check_out");--> statement-breakpoint
CREATE INDEX "groups_owner_idx" ON "groups" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "hotels_city_idx" ON "hotels" USING btree ("city");--> statement-breakpoint
CREATE INDEX "rooms_hotel_idx" ON "rooms" USING btree ("hotel_id");--> statement-breakpoint
CREATE INDEX "saved_options_group_idx" ON "saved_options" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "searches_traveller_idx" ON "searches" USING btree ("traveller_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "travellers" ADD CONSTRAINT "travellers_home_city_departure_cities_city_fk" FOREIGN KEY ("home_city") REFERENCES "public"."departure_cities"("city") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travellers" ADD CONSTRAINT "travellers_home_airport_departure_cities_airport_fk" FOREIGN KEY ("home_airport") REFERENCES "public"."departure_cities"("airport") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "travellers" ADD CONSTRAINT "travellers_name_check" CHECK (length(trim("travellers"."name")) BETWEEN 1 AND 60);--> statement-breakpoint
ALTER TABLE "travellers" ADD CONSTRAINT "travellers_age_check" CHECK ("travellers"."age" BETWEEN 18 AND 120);--> statement-breakpoint
ALTER TABLE "travellers" ADD CONSTRAINT "travellers_gender_check" CHECK ("travellers"."gender" IN ('FEMALE', 'MALE'));--> statement-breakpoint
ALTER TABLE "travellers" ADD CONSTRAINT "travellers_interests_check" CHECK (cardinality("travellers"."interests") >= 1);--> statement-breakpoint
ALTER TABLE "travellers" ADD CONSTRAINT "travellers_gender_preference_check" CHECK ("travellers"."gender_preference" IN ('ANY', 'SAME_GENDER'));--> statement-breakpoint
-- Bookings are immutable once created (M6).
CREATE FUNCTION forbid_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable', TG_TABLE_NAME;
END $$;--> statement-breakpoint
CREATE TRIGGER bookings_immutable BEFORE UPDATE OR DELETE ON "bookings"
  FOR EACH ROW EXECUTE FUNCTION forbid_change();--> statement-breakpoint
-- A booked group is closed: no new requests and no approvals (D-009).
-- Pending requests may still be rejected.
CREATE FUNCTION forbid_join_after_booking() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('pending', 'approved')
     AND EXISTS (SELECT 1 FROM bookings b WHERE b.group_id = NEW.group_id) THEN
    RAISE EXCEPTION 'group % is booked and closed to new members', NEW.group_id;
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER memberships_closed_after_booking BEFORE INSERT OR UPDATE ON "group_memberships"
  FOR EACH ROW EXECUTE FUNCTION forbid_join_after_booking();
