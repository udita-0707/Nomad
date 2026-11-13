-- P1 (D-012): every group owner is an approved member. Backfills groups created by the
-- M2 form before createGroup started inserting the owner's membership.
INSERT INTO "group_memberships" ("group_id", "traveller_id", "status", "decided_at")
SELECT "id", "owner_id", 'approved', now() FROM "groups"
ON CONFLICT DO NOTHING;
