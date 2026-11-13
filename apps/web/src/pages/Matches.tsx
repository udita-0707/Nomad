import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { GENDER_COMPOSITIONS, type CatalogResponse, type GenderComposition, type Match, type MatchFilters, type Search } from '@nomad/shared';
import { BookSoloLink } from '../components/BookSoloLink';
import { Logo } from '../components/Logo';
import { ApiError } from '../lib/api';
import { useCatalog } from '../lib/useCatalog';
import { useSearchMatches } from '../lib/useSearch';
import { useRequestToJoin } from '../lib/useRequests';
import { PROFILE_NEEDED_NOTICE } from './Search';

const DAY_MS = 86_400_000;

function nights(checkIn: string, checkOut: string) {
  return Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / DAY_MS);
}

function inr(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

// Dates are calendar days in the destination's local time (DATA_DICTIONARY.md).
function formatDate(date: string, timeZone?: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(new Date(`${date}T12:00:00Z`));
}

// M4: groups that match a saved search, ranked by the backend.
export function MatchesPage() {
  const { id = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: unfilteredData, isLoading: initialLoading, error: initialError } = useSearchMatches(id);
  const rawInterests = (searchParams.get('interests') ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  const rawGender = searchParams.get('gender') as GenderComposition | null;
  const initialGender = rawGender && GENDER_COMPOSITIONS.includes(rawGender) ? rawGender : 'ANY';
  const filters: MatchFilters = useMemo(() => {
    if (!unfilteredData) return { interests: [], gender: 'ANY' };
    const valid = rawInterests.filter((interest): interest is MatchFilters['interests'][number] => unfilteredData.search.interests.includes(interest as MatchFilters['interests'][number]));
    return { interests: [...new Set(valid)], gender: initialGender };
  }, [unfilteredData, rawInterests.join(','), initialGender]);
  useEffect(() => {
    if (!unfilteredData) return;
    const next = new URLSearchParams();
    if (filters.interests.length) next.set('interests', filters.interests.join(','));
    if (filters.gender !== 'ANY') next.set('gender', filters.gender);
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [unfilteredData, filters.interests.join(','), filters.gender, searchParams, setSearchParams]);
  const { data, isLoading, error } = useSearchMatches(id, filters);
  const { data: catalog } = useCatalog();
  const [requestStates, setRequestStates] = useState<Record<string, 'idle' | 'pending' | 'approved' | 'rejected'>>({});
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});

  const activeError = error ?? initialError;
  if (activeError instanceof ApiError && activeError.body.code === 'PROFILE_REQUIRED') {
    return <Navigate to="/profile" replace state={{ notice: PROFILE_NEEDED_NOTICE }} />;
  }
  const notFound = activeError instanceof ApiError && activeError.status === 404;
  const timeZone = catalog?.destinationCities.find((c) => c.name === data?.search.city)?.timezone;
  const labels = new Map((catalog?.interests ?? []).map((i) => [i.id, i.label]));
  const hasFilters = filters.interests.length > 0 || filters.gender !== 'ANY';
  const loading = initialLoading || (isLoading && !data);

  function updateFilters(next: MatchFilters) {
    const params = new URLSearchParams();
    if (next.interests.length) params.set('interests', [...next.interests].sort().join(','));
    if (next.gender !== 'ANY') params.set('gender', next.gender);
    setSearchParams(params);
  }

  return (
    <main className="group-create-page">
      <header className="group-create-nav">
        <Link to="/dashboard" aria-label="Back to dashboard"><Logo /></Link>
        <Link className="quiet-link" to="/search">New search ↗</Link>
      </header>
      <section className="matches-shell">
        {loading && <MatchesSkeleton />}
        {notFound && <EmptyState title="Search not found" text="This search doesn’t exist or belongs to another traveller." action="Start a new search" />}
        {activeError && !notFound && <p className="form-error" role="alert">Could not load your matches. Refresh to try again.</p>}
        {data && (
          <>
            <SearchSummary search={data.search} count={data.matches.length} timeZone={timeZone} />
            {data.totalMatches > 0 && <MatchFiltersBar search={data.search} filters={filters} labels={labels} onChange={updateFilters} />}
            {data.totalMatches === 0 ? (
              <EmptyState title="No groups match yet" text="Try widening your dates, adding a few more interests, or adjusting your budget. Or book your own stay for these dates." action="Edit search" solo={data.search} />
            ) : data.matches.length === 0 ? (
              <FilteredEmpty onClear={() => updateFilters({ interests: [], gender: 'ANY' })} />
            ) : (
              <><p className="filter-count">{hasFilters ? `Showing ${data.matches.length} of ${data.totalMatches} groups` : `${data.totalMatches} groups found`}</p><div className="match-list">{data.matches.map((match) => <MatchCard key={match.groupId} match={match} searchId={data.search.id} timeZone={timeZone} labels={labels} requestState={requestStates[match.groupId] ?? 'idle'} requestError={requestErrors[match.groupId] ?? ''} onRequestStateChange={(state, error = '') => { setRequestStates((current) => ({ ...current, [match.groupId]: state })); setRequestErrors((current) => ({ ...current, [match.groupId]: error })); }} />)}</div></>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function MatchFiltersBar({ search, filters, labels, onChange }: { search: Search; filters: MatchFilters; labels: Map<string, string>; onChange: (filters: MatchFilters) => void }) {
  const toggleInterest = (interest: MatchFilters['interests'][number]) => onChange({ ...filters, interests: filters.interests.includes(interest) ? filters.interests.filter((item) => item !== interest) : [...filters.interests, interest] });
  return <section className="match-filters" aria-label="Filter matches"><div><p className="filter-label">Shared interests</p><small>Groups must share all selected</small><div className="chip-row">{search.interests.map((interest) => <button type="button" className={filters.interests.includes(interest) ? 'chip chip-on' : 'chip'} aria-pressed={filters.interests.includes(interest)} onClick={() => toggleInterest(interest)} key={interest}>{labels.get(interest) ?? interest}</button>)}</div></div><div><p className="filter-label">Group make-up</p><div className="gender-filter" role="group" aria-label="Group make-up">{([['ANY', 'Any'], ['ALL_FEMALE', 'All female'], ['ALL_MALE', 'All male'], ['MIXED', 'Mixed']] as const).map(([value, label]) => <button type="button" className={filters.gender === value ? 'gender-filter-on' : ''} onClick={() => onChange({ ...filters, gender: value })} key={value}>{label}</button>)}</div></div>{(filters.interests.length > 0 || filters.gender !== 'ANY') && <button type="button" className="clear-filters" onClick={() => onChange({ interests: [], gender: 'ANY' })}>Clear filters</button>}</section>;
}

function FilteredEmpty({ onClear }: { onClear: () => void }) {
  return <div className="matches-empty"><span>✦</span><h2>No groups match these filters</h2><p>Try removing one of your filters to see more matching groups.</p><button className="button button-small" type="button" onClick={onClear}>Clear filters <span>↗</span></button></div>;
}

function SearchSummary({ search, count, timeZone }: { search: Search; count: number; timeZone?: string }) {
  return (
    <div className="matches-header">
      <div>
        <p className="eyebrow">Your matches · M4</p>
        <h1>{count} {count === 1 ? 'group' : 'groups'} in<br /><em>{search.city}.</em></h1>
      </div>
      <dl className="search-summary">
        <div><dt>Dates</dt><dd>{formatDate(search.checkIn, timeZone)} → {formatDate(search.checkOut, timeZone)}</dd></div>
        <div><dt>Nights</dt><dd>{nights(search.checkIn, search.checkOut)}</dd></div>
        <div><dt>Budget</dt><dd>{inr(search.budgetInr)}</dd></div>
        <div><dt>From</dt><dd>{search.homeCity}</dd></div>
      </dl>
      <Link className="inline-action" to="/search">Edit search ↗</Link>
    </div>
  );
}

function MatchCard({ match, searchId, timeZone, labels, requestState, requestError, onRequestStateChange }: { match: Match; searchId: string; timeZone?: string; labels: Map<string, CatalogResponse['interests'][number]['label']>; requestState: 'idle' | 'pending' | 'approved' | 'rejected'; requestError: string; onRequestStateChange: (state: 'idle' | 'pending' | 'approved' | 'rejected', error?: string) => void }) {
  const request = useRequestToJoin();
  const shared = match.sharedInterests.map((id) => labels.get(id) ?? id).join(', ');
  const fill = Math.min(100, Math.round((match.membersCount / match.maxSize) * 100));
  async function sendRequest() {
    onRequestStateChange(requestState, '');
    try { await request.mutateAsync({ groupId: match.groupId, searchId }); onRequestStateChange('pending'); }
    catch (err) { onRequestStateChange(requestState, err instanceof ApiError ? err.body.message : 'Could not send the request.'); }
  }
  return (
    <article className="match-result">
      <div className="match-result-main">
        <span className="group-list-city">{match.city} · {formatDate(match.checkIn, timeZone)} → {formatDate(match.checkOut, timeZone)}</span>
        <h3>{match.name}</h3>
        <p className="match-owner">Hosted by <Link to={`/travellers/${match.members.find((member) => member.isOwner)?.id ?? ''}`}><strong>{match.ownerName}</strong></Link> · {match.femaleCount} F · {match.maleCount} M</p>
        <p className="match-members">{match.members.map((member) => <span key={member.id}><Link to={`/travellers/${member.id}`}>{member.name}</Link>{member.isOwner && <small> Owner</small>}</span>)}</p>
        <p className="match-reason">{match.sharedNights} shared nights · shared: {shared} · budget gap {inr(match.budgetDiffInr)}</p>
      </div>
      <div className="match-result-side">
        <div className="match-capacity">
          <span>{match.membersCount}/{match.maxSize} travellers</span>
          <div className="capacity-bar" role="progressbar" aria-valuemin={0} aria-valuemax={match.maxSize} aria-valuenow={match.membersCount}><i style={{ width: `${fill}%` }} /></div>
        </div>
        <button className="button button-small" type="button" onClick={sendRequest} disabled={request.isPending || requestState !== 'idle'}>{request.isPending ? 'Sending…' : requestState === 'pending' ? 'Request pending' : requestState === 'approved' ? 'Joined' : requestState === 'rejected' ? 'Request declined' : 'Request to join'}</button>
        {requestError && <small className="request-error" role="alert">{requestError}</small>}
      </div>
    </article>
  );
}

function EmptyState({ title, text, action, solo }: { title: string; text: string; action: string; solo?: Search }) {
  return (
    <div className="matches-empty">
      <span>✦</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="empty-actions">
        <Link className="button button-small" to="/search">{action} <span>↗</span></Link>
        {solo && <BookSoloLink city={solo.city} checkIn={solo.checkIn} checkOut={solo.checkOut} className="button button-ghost button-small" />}
      </div>
    </div>
  );
}

function MatchesSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading matches">
      <div className="skeleton skeleton-title" />
      {[0, 1, 2].map((i) => <div className="skeleton skeleton-card" key={i} />)}
    </div>
  );
}
