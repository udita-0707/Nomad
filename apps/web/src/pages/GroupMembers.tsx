import { Link, useParams } from 'react-router-dom';
import { INTERESTS, type JoinRequestItem } from '@nomad/shared';
import { Logo } from '../components/Logo';
import { ApiError } from '../lib/api';
import { useMyGroups } from '../lib/useGroups';
import { useDecideGroupRequest, useGroupRoster } from '../lib/useRequests';

const STATUS_LABEL = { owner: 'Owner', approved: 'Joined', pending: 'Pending', rejected: 'Declined' } as const;
const labels = new Map(INTERESTS.map((interest) => [interest.id, interest.label]));

// Owner view of one group: how many have joined out of the size, and everyone's status.
// Uses GET /api/groups/mine for the counts and the M5 requests endpoint (?status=all) for the list.
export function GroupMembersPage() {
  const { id = '' } = useParams();
  const { data: mine, isLoading: groupsLoading } = useMyGroups();
  const roster = useGroupRoster(id);
  const decide = useDecideGroupRequest();
  const group = mine?.groups.find((g) => g.id === id);
  const status = roster.error instanceof ApiError ? roster.error.status : 0;

  const rows = roster.data?.requests ?? [];
  const joined = rows.filter((r) => r.status === 'approved');
  const pending = rows.filter((r) => r.status === 'pending');
  const declined = rows.filter((r) => r.status === 'rejected');
  const ordered = [...joined, ...pending, ...declined];
  const full = group ? joined.length >= group.maxSize : false;

  return (
    <main className="group-create-page">
      <header className="group-create-nav">
        <Link to="/dashboard" aria-label="Back to dashboard"><Logo /></Link>
        <Link className="quiet-link" to="/dashboard">Back to dashboard ↗</Link>
      </header>
      <section className="matches-shell">
        {(groupsLoading || roster.isLoading) && <div className="skeleton skeleton-title" aria-busy="true" />}
        {(status === 403 || (!groupsLoading && mine && !group && status !== 404)) && <Blocked title="Owners only" text="Only the group owner can see its members and requests." />}
        {status === 404 && <Blocked title="Group not found" text="This group doesn’t exist, or it was removed." />}
        {group && roster.data && (
          <>
            <div className="matches-header">
              <div>
                <p className="eyebrow">Your group · members</p>
                <h1>{group.name}<br /><em>{joined.length} of {group.maxSize} joined.</em></h1>
              </div>
              <Link className="inline-action" to={`/groups/${group.id}/plan`}>Open group page ↗</Link>
              <dl className="search-summary">
                <div><dt>Where</dt><dd>{group.city}</dd></div>
                <div><dt>Dates</dt><dd>{group.checkIn} → {group.checkOut}</dd></div>
                <div><dt>Pending</dt><dd>{pending.length}</dd></div>
                <div><dt>Spots left</dt><dd>{Math.max(0, group.maxSize - joined.length)}</dd></div>{group.bookedHotelName && <div><dt>Booked</dt><dd>{group.bookedHotelName}</dd></div>}
              </dl>
              <div className="members-capacity"><div className="capacity-bar" role="progressbar" aria-label="Members joined" aria-valuemin={0} aria-valuemax={group.maxSize} aria-valuenow={joined.length}><i style={{ width: `${Math.min(100, (joined.length / group.maxSize) * 100)}%` }} /></div></div>
            </div>
            {decide.error && <p className="form-error" role="alert">{decide.error instanceof ApiError ? decide.error.body.message : 'Could not update the request.'}</p>}
            <div className="member-list">
              {ordered.map((row) => (
                <MemberRow
                  key={row.travellerId}
                  row={row}
                  isOwner={row.travellerId === group.ownerId}
                  canApprove={!full && !group.booked}
                  busy={decide.isPending}
                  onDecide={(next) => decide.mutate({ groupId: group.id, travellerId: row.travellerId, status: next })}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function MemberRow({ row, isOwner, canApprove, busy, onDecide }: { row: JoinRequestItem; isOwner: boolean; canApprove: boolean; busy: boolean; onDecide: (status: 'approved' | 'rejected') => void }) {
  const state = isOwner ? 'owner' : row.status;
  const shared = row.sharedInterests.map((i) => labels.get(i) ?? i).join(', ');
  return (
    <article className={`member-row member-${state}`}>
      <div>
        <h3>{row.traveller.name}</h3>
        <small>{row.traveller.homeCity}{row.traveller.age ? ` · ${row.traveller.age}` : ''}{shared && !isOwner ? ` · shares ${shared}` : ''}</small>
        {row.search && !isOwner && <small>Wants {row.search.checkIn} → {row.search.checkOut} · ₹{row.search.budgetInr.toLocaleString('en-IN')}</small>}
      </div>
      <div className="request-actions">
        <span className={`status-badge status-${state}`}>{STATUS_LABEL[state]}</span>
        {state === 'pending' && (
          <>
            <button type="button" className="button button-small" disabled={busy || !canApprove} title={canApprove ? undefined : 'The group is full'} onClick={() => onDecide('approved')}>Approve</button>
            <button type="button" className="request-reject" disabled={busy} onClick={() => onDecide('rejected')}>Reject</button>
          </>
        )}
      </div>
    </article>
  );
}

function Blocked({ title, text }: { title: string; text: string }) {
  return (
    <div className="matches-empty">
      <span>✦</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <Link className="button button-small" to="/dashboard">Back to dashboard <span>↗</span></Link>
    </div>
  );
}
