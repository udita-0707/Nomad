import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HOTEL_SORTS, type HotelOption, type HotelOptionsResponse, type HotelSearchFilters } from '@nomad/shared';
import { Logo } from '../components/Logo';
import { ApiError } from '../lib/api';
import { useGroupHotels } from '../lib/useGroupPage';

type Sort = (typeof HOTEL_SORTS)[number];
const SORT_LABELS: Record<Sort, string> = { perMember: 'Lowest cost each', rating: 'Best rated', stars: 'Most stars' };

function inr(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
}

// Dates are calendar days in the destination's local time (DATA_DICTIONARY.md).
function formatDate(date: string, timeZone?: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(new Date(`${date}T12:00:00Z`));
}

// M6: the Common Group Page. Members compare hotels for the group's city and dates.
// Booking is a confirm popup only: nothing is saved (acceptance criteria, D-014).
export function GroupPlanPage() {
  const { id = '' } = useParams();
  const [sort, setSort] = useState<Sort>('perMember');
  const [refundable, setRefundable] = useState(false);
  const [minStars, setMinStars] = useState(0);
  const [choice, setChoice] = useState<HotelOption | null>(null);
  const [confirmed, setConfirmed] = useState<HotelOption | null>(null);

  const filters: HotelSearchFilters = { sort, ...(refundable && { refundable: 'true' as const }), ...(minStars > 0 && { minStars }) };
  const { data, isLoading, isFetching, error } = useGroupHotels(id, filters);
  const status = error instanceof ApiError ? error.status : 0;

  return (
    <main className="group-create-page">
      <header className="group-create-nav">
        <Link to="/dashboard" aria-label="Back to dashboard"><Logo /></Link>
        <Link className="quiet-link" to="/dashboard">Back to dashboard ↗</Link>
      </header>
      <section className="matches-shell">
        {isLoading && <PlanSkeleton />}
        {status === 403 && <Blocked title="Members only" text="Only members of this group can open its page." />}
        {status === 404 && <Blocked title="Group not found" text="This group doesn’t exist, or it was removed." />}
        {error && status !== 403 && status !== 404 && <p className="form-error" role="alert">Could not load hotels. Refresh to try again.</p>}
        {data && (
          <>
            <PlanHeader context={data.context} />
            {confirmed && (
              <div className="plan-confirmed" role="status">
                <span>✓</span>
                <p><strong>Booking confirmed for {confirmed.hotel.name}, {inr(confirmed.perMemberInr)} each.</strong> {confirmed.room.name} × {confirmed.roomsNeeded} for {data.context.nights} nights, {inr(confirmed.totalInr)} in total.</p>
                <button className="inline-action" type="button" onClick={() => setConfirmed(null)}>Dismiss</button>
              </div>
            )}
            <div className="plan-filters" aria-label="Filter hotels">
              <label>Sort by <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>{HOTEL_SORTS.map((s) => <option key={s} value={s}>{SORT_LABELS[s]}</option>)}</select></label>
              <label>Stars <select value={minStars} onChange={(event) => setMinStars(Number(event.target.value))}><option value={0}>Any</option>{[3, 4, 5].map((n) => <option key={n} value={n}>{n}★ and up</option>)}</select></label>
              <label className="plan-check"><input type="checkbox" checked={refundable} onChange={(event) => setRefundable(event.target.checked)} /> Refundable only</label>
              <span className="plan-count" aria-live="polite">{isFetching ? 'Updating…' : `${data.options.length} ${data.options.length === 1 ? 'option' : 'options'}`}</span>
            </div>
            {data.options.length === 0 ? (
              <div className="matches-empty">
                <span>✦</span>
                <h2>No rooms are free for every night of your stay</h2>
                <p>Try removing a filter. If nothing fits, agree on new dates with your group.</p>
              </div>
            ) : (
              <div className="match-list">{data.options.map((option) => <HotelCard key={option.room.id} option={option} nights={data.context.nights} onBook={() => setChoice(option)} />)}</div>
            )}
            <p className="plan-credits">Hotel photos from Wikimedia Commons (CC0, CC BY and CC BY-SA). <a href="/api/photo-credits" target="_blank" rel="noreferrer">Photo credits ↗</a></p>
          </>
        )}
      </section>
      {choice && data && (
        <ConfirmBooking
          option={choice}
          context={data.context}
          onCancel={() => setChoice(null)}
          onConfirm={() => {
            setConfirmed(choice);
            setChoice(null);
          }}
        />
      )}
    </main>
  );
}

function PlanHeader({ context }: { context: HotelOptionsResponse['context'] }) {
  const { city, checkIn, checkOut, nights, membersCount, timezone } = context;
  return (
    <div className="matches-header">
      <div>
        <p className="eyebrow">Common group page · M6</p>
        <h1>Where you’ll stay<br />in <em>{city}.</em></h1>
      </div>
      <dl className="search-summary">
        <div><dt>Dates</dt><dd>{formatDate(checkIn, timezone)} → {formatDate(checkOut, timezone)}</dd></div>
        <div><dt>Nights</dt><dd>{nights}</dd></div>
        <div><dt>Group</dt><dd>{membersCount} {membersCount === 1 ? 'traveller' : 'travellers'}</dd></div>
      </dl>
      <p className="plan-how"><strong>How costs work:</strong> price per night × rooms × nights, split equally between the {membersCount} {membersCount === 1 ? 'member' : 'members'}. Each room type shown is free for every night of the stay.</p>
    </div>
  );
}

function HotelCard({ option, nights, onBook }: { option: HotelOption; nights: number; onBook: () => void }) {
  const { hotel, room } = option;
  return (
    <article className="match-result hotel-result">
      {hotel.image && <img className="hotel-photo" src={hotel.image} alt="" loading="lazy" />}
      <div className="match-result-main">
        <span className="group-list-city">{'★'.repeat(hotel.stars)} · rated {hotel.rating.toFixed(1)}/10</span>
        <h3>{hotel.name}</h3>
        <p className="match-owner">{room.name} · {titleCase(room.type)} · up to {room.maxAdults} adults{room.refundable && <span className="hotel-badge">Refundable</span>}</p>
        <p className="match-reason">{inr(room.pricePerNightInr)} × {option.roomsNeeded} {option.roomsNeeded === 1 ? 'room' : 'rooms'} × {nights} nights = {inr(option.totalInr)}</p>
      </div>
      <div className="match-result-side">
        <div className="hotel-price">
          <strong>{inr(option.perMemberInr)}</strong>
          <small>each · {inr(option.totalInr)} total</small>
        </div>
        <button className="button button-small" type="button" onClick={onBook}>Book <span>↗</span></button>
      </div>
    </article>
  );
}

// A native <dialog> opened with showModal() keeps focus inside and closes on Esc.
function ConfirmBooking({ option, context, onCancel, onConfirm }: { option: HotelOption; context: HotelOptionsResponse['context']; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog ref={ref} className="confirm-dialog" aria-labelledby="confirm-title" onClose={onCancel}>
      <p className="eyebrow">Confirm booking</p>
      <h2 id="confirm-title">{option.hotel.name}</h2>
      <dl className="confirm-lines">
        <div><dt>Room</dt><dd>{option.room.name} × {option.roomsNeeded}</dd></div>
        <div><dt>Stay</dt><dd>{formatDate(context.checkIn, context.timezone)} → {formatDate(context.checkOut, context.timezone)}, {context.nights} nights</dd></div>
        <div><dt>Total</dt><dd>{inr(option.totalInr)}</dd></div>
        <div><dt>Each of {context.membersCount}</dt><dd className="confirm-share">{inr(option.perMemberInr)}</dd></div>
      </dl>
      <p className="confirm-note">Book once your group has agreed.</p>
      <div className="confirm-actions">
        <button className="button button-ghost button-small" type="button" onClick={() => ref.current?.close()}>Cancel</button>
        <button className="button button-small" type="button" autoFocus onClick={onConfirm}>Confirm booking <span>↗</span></button>
      </div>
    </dialog>
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

function PlanSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading hotels">
      <div className="skeleton skeleton-title" />
      {[0, 1, 2].map((i) => <div className="skeleton skeleton-card" key={i} />)}
    </div>
  );
}
