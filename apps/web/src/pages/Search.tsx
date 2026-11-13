import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { GROUP_DATE_MAX, GROUP_DATE_MIN, searchRequestSchema, type CatalogResponse, type Search, type SearchRequest } from '@nomad/shared';
import { Logo } from '../components/Logo';
import { ApiError } from '../lib/api';
import { useCatalog } from '../lib/useCatalog';
import { useProfile } from '../lib/useProfile';
import { useCreateSearch } from '../lib/useSearch';

type InterestId = SearchRequest['interests'][number];

const initialForm = {
  homeCity: 'Bengaluru' as SearchRequest['homeCity'],
  city: 'Kyoto' as SearchRequest['city'],
  checkIn: '',
  checkOut: '',
  interests: [] as InterestId[],
  budgetInr: '',
  genderPreference: 'ANY' as SearchRequest['genderPreference'],
};

export const PROFILE_NEEDED_NOTICE = 'Set up your traveller profile first. Matching uses your gender and interests.';

// The day after a YYYY-MM-DD date, as YYYY-MM-DD (dates are plain calendar days).
function nextDay(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
}

function groupByCategory(interests: CatalogResponse['interests']) {
  const groups = new Map<string, CatalogResponse['interests']>();
  interests.forEach((interest) => groups.set(interest.category, [...(groups.get(interest.category) ?? []), interest]));
  return [...groups.entries()];
}

// M3: the seeker's search form. Prefilled from the saved profile; values only apply to this search.
export function SearchPage() {
  const { data: profileData, isLoading: profileLoading } = useProfile();
  const { data: catalog, isLoading: catalogLoading, isError: catalogError } = useCatalog();
  const createSearch = useCreateSearch();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [profileMissing, setProfileMissing] = useState(false);
  const [saved, setSaved] = useState<Search | null>(null);
  const profile = profileData?.profile;

  useEffect(() => {
    if (profile) {
      setForm((current) => ({
        ...current,
        homeCity: profile.homeCity,
        interests: profile.interests,
        genderPreference: profile.genderPreference,
      }));
    }
  }, [profile]);

  const interestGroups = useMemo(() => groupByCategory(catalog?.interests ?? []), [catalog]);

  if (profileMissing || (!profileLoading && profileData && !profile)) {
    return <Navigate to="/profile" replace state={{ notice: PROFILE_NEEDED_NOTICE }} />;
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
    setError('');
    setSaved(null);
  }

  function updateCheckIn(value: string) {
    setForm((current) => ({
      ...current,
      checkIn: value,
      checkOut: current.checkOut && value && current.checkOut <= value ? '' : current.checkOut,
    }));
    setFieldErrors((current) => ({ ...current, checkIn: '', checkOut: '' }));
    setError('');
  }

  function toggleInterest(id: InterestId) {
    update('interests', form.interests.includes(id) ? form.interests.filter((i) => i !== id) : [...form.interests, id]);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setSaved(null);
    const parsed = searchRequestSchema.safeParse({ ...form, budgetInr: form.budgetInr === '' ? undefined : Number(form.budgetInr) });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = String(issue.path[0] ?? 'form');
        next[key] ??= issue.message;
      });
      setFieldErrors(next);
      setError('Please check the highlighted details.');
      return;
    }
    createSearch.mutate(parsed.data, {
      onSuccess: (res) => setSaved(res.search),
      onError: (err) => {
        if (err instanceof ApiError && err.body.code === 'PROFILE_REQUIRED') return setProfileMissing(true);
        if (err instanceof ApiError && err.body.fields) setFieldErrors(err.body.fields);
        setError(err instanceof ApiError ? err.body.message : 'Could not search right now. Please try again.');
      },
    });
  }

  const searching = createSearch.isPending;
  const gender = profile?.gender === 'MALE' ? 'male' : 'female';

  return (
    <main className="group-create-page">
      <header className="group-create-nav">
        <Link to="/dashboard" aria-label="Back to dashboard"><Logo /></Link>
        <Link className="quiet-link" to="/dashboard">Back to dashboard ↗</Link>
      </header>
      <section className="group-create-shell">
        <div className="group-create-intro">
          <p className="eyebrow">Group seeker · M3</p>
          <h1>Find a group<br /><em>going your way.</em></h1>
          <p>Tell us your trip. We only show groups that pass all six matching rules.</p>
          <div className="group-rules"><span>✦</span><div><strong>How matching works</strong><small>Same city · at least 2 shared nights · budgets within 40% · 2+ interests shared with the owner · gender preferences on both sides · a free spot.</small></div></div>
        </div>
        <form className="group-form" onSubmit={submit} noValidate>
          <div className="group-form-heading"><p className="eyebrow">Your search</p><h2>Where and when?</h2></div>
          {(profileLoading || catalogLoading) && <p className="search-loading">Loading your profile…</p>}
          {catalogError && <p className="form-error" role="alert">Could not load cities and interests. Refresh to try again.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {saved && <p className="already-signed" role="status"><strong>Search saved.</strong> {saved.city}, {saved.checkIn} → {saved.checkOut}, ₹{saved.budgetInr.toLocaleString('en-IN')}. Matching groups arrive with M4.</p>}
          <div className="group-form-grid">
            <label>Home city <select value={form.homeCity} onChange={(event) => update('homeCity', event.target.value as typeof form.homeCity)}>{(catalog?.departureCities ?? []).map((c) => <option key={c.city} value={c.city}>{c.city} ({c.airport})</option>)}</select>{fieldErrors.homeCity && <small className="field-error">{fieldErrors.homeCity}</small>}</label>
            <label>Destination <select value={form.city} onChange={(event) => update('city', event.target.value as typeof form.city)}>{(catalog?.destinationCities ?? []).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>{fieldErrors.city && <small className="field-error">{fieldErrors.city}</small>}</label>
          </div>
          <div className="group-form-grid">
            <label>Check-in <input type="date" min={GROUP_DATE_MIN} max={GROUP_DATE_MAX} value={form.checkIn} onChange={(event) => updateCheckIn(event.target.value)} aria-invalid={Boolean(fieldErrors.checkIn)} />{fieldErrors.checkIn && <small className="field-error">{fieldErrors.checkIn}</small>}</label>
            <label>Check-out <input type="date" min={form.checkIn ? nextDay(form.checkIn) : GROUP_DATE_MIN} max={GROUP_DATE_MAX} value={form.checkOut} onChange={(event) => update('checkOut', event.target.value)} aria-invalid={Boolean(fieldErrors.checkOut)} />{fieldErrors.checkOut && <small className="field-error">{fieldErrors.checkOut}</small>}</label>
          </div>
          <fieldset className="interest-picker" aria-invalid={Boolean(fieldErrors.interests)}>
            <legend>Interests <span className="field-hint">{form.interests.length} selected</span></legend>
            {interestGroups.map(([category, items]) => (
              <div className="interest-group" key={category}>
                <small>{titleCase(category)}</small>
                <div className="chip-row">
                  {items.map((interest) => {
                    const on = form.interests.includes(interest.id);
                    return <button key={interest.id} type="button" className={on ? 'chip chip-on' : 'chip'} aria-pressed={on} onClick={() => toggleInterest(interest.id)}>{interest.label}</button>;
                  })}
                </div>
              </div>
            ))}
            {fieldErrors.interests && <small className="field-error">{fieldErrors.interests}</small>}
          </fieldset>
          <div className="group-form-grid">
            <label>Budget per person <div className="money-input"><span>₹</span><input inputMode="numeric" type="number" min="1" step="1" value={form.budgetInr} onChange={(event) => update('budgetInr', event.target.value)} placeholder="62000" aria-invalid={Boolean(fieldErrors.budgetInr)} /></div>{fieldErrors.budgetInr && <small className="field-error">{fieldErrors.budgetInr}</small>}</label>
            <label>Travel with <select value={form.genderPreference} onChange={(event) => update('genderPreference', event.target.value as typeof form.genderPreference)}><option value="ANY">Anyone</option><option value="SAME_GENDER">Same gender only</option></select>{fieldErrors.genderPreference && <small className="field-error">{fieldErrors.genderPreference}</small>}</label>
          </div>
          {profile && <p className="search-note">Matching uses your profile gender ({gender}). <Link to="/profile">Edit profile</Link></p>}
          <button className="button group-submit" type="submit" disabled={searching || !catalog}>{searching ? 'Searching…' : 'Search groups'} <span>↗</span></button>
        </form>
      </section>
    </main>
  );
}
