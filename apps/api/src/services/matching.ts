import { sql, type SQL } from 'drizzle-orm';
import type { InterestId, Match, Search } from '@nomad/shared';
import { db } from '../db/index.js';

// The six M4 rules from docs/match-groups.sql, run in one query with bound parameters.
// The seeker fields come from a stored search; gender is the profile gender.
type SeekerFields = Pick<
  Search,
  'city' | 'checkIn' | 'checkOut' | 'budgetInr' | 'interests' | 'gender' | 'genderPreference'
> & { travellerId: string };
// During approval, the pending membership itself is ignored while the six
// matching rules are re-evaluated. New requests still use the default false.
type SeekerOptions = { ignoreExistingMembership?: boolean };
type Seeker = SeekerFields & SeekerOptions;

type MatchRow = {
  id: string;
  name: string;
  city: Match['city'];
  check_in: string;
  check_out: string;
  members_count: number;
  max_size: number;
  owner_name: string;
  shared_nights: number;
  shared_interests: InterestId[];
  budget_inr: number;
  budget_diff: number;
};

function matchQuery(s: Seeker & SeekerOptions, onlyGroupId?: string): SQL {
  const interests = sql`${`{${s.interests.join(',')}}`}::text[]`;
  const groupFilter = onlyGroupId ? sql`AND g.id = ${onlyGroupId}` : sql``;
  const membershipFilter = s.ignoreExistingMembership ? sql`` : sql`AND NOT EXISTS (SELECT 1 FROM group_memberships m WHERE m.group_id = g.id AND m.traveller_id = ${s.travellerId})`;
  return sql`
    WITH g AS (
      SELECT g.*, o.name AS owner_name,
             (SELECT count(*)::int FROM group_memberships m
               WHERE m.group_id = g.id AND m.status = 'approved') AS members_count,
             (LEAST(g.check_out, ${s.checkOut}::date) - GREATEST(g.check_in, ${s.checkIn}::date))::int AS shared_nights,
             ARRAY(SELECT unnest(o.interests) INTERSECT SELECT unnest(${interests}) ORDER BY 1) AS shared_interests
      FROM groups g
      JOIN travellers o ON o.id = g.owner_id
      WHERE g.city = ${s.city}
        AND g.check_in < ${s.checkOut}::date AND g.check_out > ${s.checkIn}::date
        AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.group_id = g.id)
        ${membershipFilter}
        ${groupFilter}
    )
    SELECT id, name, city, to_char(check_in, 'YYYY-MM-DD') AS check_in, to_char(check_out, 'YYYY-MM-DD') AS check_out,
           members_count, max_size, owner_name, shared_nights, shared_interests, budget_inr,
           abs(budget_inr - ${s.budgetInr}::int)::int AS budget_diff
    FROM g
    WHERE shared_nights >= 2
      AND 5 * abs(budget_inr - ${s.budgetInr}::int) <= 2 * LEAST(budget_inr, ${s.budgetInr}::int)
      AND cardinality(shared_interests) >= 2
      AND NOT EXISTS (
            SELECT 1 FROM group_memberships m
            JOIN travellers t ON t.id = m.traveller_id
            WHERE m.group_id = g.id AND m.status = 'approved'
              AND t.gender <> ${s.gender}
              AND (t.gender_preference = 'SAME_GENDER' OR ${s.genderPreference} = 'SAME_GENDER'))
      AND members_count + 1 <= max_size
    ORDER BY cardinality(shared_interests) DESC, shared_nights DESC, budget_diff ASC, check_in ASC, id ASC`;
}

function toMatch(r: MatchRow): Match {
  return {
    groupId: r.id,
    name: r.name,
    city: r.city,
    checkIn: r.check_in,
    checkOut: r.check_out,
    membersCount: r.members_count,
    maxSize: r.max_size,
    ownerName: r.owner_name,
    sharedNights: r.shared_nights,
    sharedInterests: r.shared_interests,
    budgetInr: r.budget_inr,
    budgetDiffInr: r.budget_diff,
  };
}

// All groups that pass the six rules, ranked: shared interests desc, shared nights desc,
// budget gap asc, check-in asc, group id asc (D-012).
export async function findMatches(seeker: Seeker): Promise<Match[]> {
  const { rows } = await db.execute<MatchRow>(matchQuery(seeker));
  return rows.map(toMatch);
}

// One group against the six rules. For M5: re-check before saving a join request.
export async function matchOneGroup(seeker: Seeker, groupId: string): Promise<Match | null> {
  const { rows } = await db.execute<MatchRow>(matchQuery(seeker, groupId));
  return rows[0] ? toMatch(rows[0]) : null;
}

export type { Seeker };
