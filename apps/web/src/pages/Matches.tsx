import { Link, Navigate, useParams } from 'react-router-dom';
import type { CatalogResponse, Match, Search } from '@nomad/shared';
import { Logo } from '../components/Logo';
import { ApiError } from '../lib/api';
import { useCatalog } from '../lib/useCatalog';
import { useSearchMatches } from '../lib/useSearch';
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
  const { data, isLoading, error } = useSearchMatches(id);
  const { data: catalog } = useCatalog();

  if (error instanceof ApiError && error.body.code === 'PROFILE_REQUIRED') {
    return <Navigate to="/profile" replace state={{ notice: PROFILE_NEEDED_NOTICE }} />;
  }
  const notFound = error instanceof ApiError && error.status === 404;
  const timeZone = catalog?.destinationCities.find((c) => c.name === data?.search.city)?.timezone;
  const labels = new Map((catalog?.interests ?? []).map((i) => [i.id, i.label]));

  return (
    <main className="group-create-page">
      <header className="group-create-nav">
        <Link to="/dashboard" aria-label="Back to dashboard"><Logo /></Link>
        <Link className="quiet-link" to="/search">New search ↗</Link>
      </header>
      <section className="matches-shell">
        {isLoading && <MatchesSkeleton />}
        {notFound && <EmptyState title="Search not found" text="This search doesn’t exist or belongs to another traveller." action="Start a new search" />}
        {error && !notFound && <p className="form-error" role="alert">Could not load your matches. Refresh to try again.</p>}
        {data && (
          <>
            <SearchSummary search={data.search} count={data.matches.length} timeZone={timeZone} />
            {data.matches.length === 0 ? (
              <EmptyState title="No groups match yet" text="Try widening your dates, adding a few more interests, or adjusting your budget." action="Edit search" />
            ) : (
              <div className="match-list">{data.matches.map((match) => <MatchCard key={match.groupId} match={match} timeZone={timeZone} labels={labels} />)}</div>
            )}
          </>
        )}
      </section>
    </main>
  );
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

function MatchCard({ match, timeZone, labels }: { match: Match; timeZone?: string; labels: Map<string, CatalogResponse['interests'][number]['label']> }) {
  const shared = match.sharedInterests.map((id) => labels.get(id) ?? id).join(', ');
  const fill = Math.min(100, Math.round((match.membersCount / match.maxSize) * 100));
  return (
    <article className="match-result">
      <div className="match-result-main">
        <span className="group-list-city">{match.city} · {formatDate(match.checkIn, timeZone)} → {formatDate(match.checkOut, timeZone)}</span>
        <h3>{match.name}</h3>
        <p className="match-owner">Hosted by <strong>{match.ownerName}</strong></p>
        <p className="match-reason">{match.sharedNights} shared nights · shared: {shared} · budget gap {inr(match.budgetDiffInr)}</p>
      </div>
      <div className="match-result-side">
        <div className="match-capacity">
          <span>{match.membersCount}/{match.maxSize} travellers</span>
          <div className="capacity-bar" role="progressbar" aria-valuemin={0} aria-valuemax={match.maxSize} aria-valuenow={match.membersCount}><i style={{ width: `${fill}%` }} /></div>
        </div>
        <span className="tooltip-wrap" title="Coming in M5"><button className="button button-small" type="button" disabled aria-describedby={`m5-${match.groupId}`}>Request to join</button><small id={`m5-${match.groupId}`} className="tooltip">Coming in M5</small></span>
      </div>
    </article>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action: string }) {
  return (
    <div className="matches-empty">
      <span>✦</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <Link className="button button-small" to="/search">{action} <span>↗</span></Link>
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
