import { and, count, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { groupMemberships, groups, travellers, type Traveller } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';

type GroupRow = typeof groups.$inferSelect;

export type MemberContext = { traveller: Traveller; group: GroupRow; membersCount: number };

// Only approved members (the owner is one, P1) may use a group's page.
// Throws 422 PROFILE_REQUIRED, 404 NOT_FOUND or 403 FORBIDDEN, in that order.
export async function assertMember(groupId: string, userId: string): Promise<MemberContext> {
  const [traveller] = await db.select().from(travellers).where(eq(travellers.userId, userId));
  if (!traveller) {
    throw new AppError(422, 'PROFILE_REQUIRED', 'Complete your traveller profile before opening a group page');
  }
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) throw new AppError(404, 'NOT_FOUND', 'Group not found');

  const [me] = await db
    .select({ status: groupMemberships.status })
    .from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.travellerId, traveller.id)));
  if (me?.status !== 'approved') {
    throw new AppError(403, 'FORBIDDEN', 'Only members of this group can open its page');
  }

  const [{ n }] = await db
    .select({ n: count() })
    .from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.status, 'approved')));
  return { traveller, group, membersCount: n };
}
