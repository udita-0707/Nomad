import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DESTINATION_CITIES, GROUP_DATE_MAX, GROUP_DATE_MIN, groupCreateRequestSchema } from '@nomad/shared';
import { Logo } from '../components/Logo';
import { api, ApiError } from '../lib/api';

const initialForm = {
  name: '',
  city: 'Kyoto' as (typeof DESTINATION_CITIES)[number],
  checkIn: '',
  checkOut: '',
  maxSize: '2',
  budgetInr: '',
  itinerary: '',
};

export function CreateGroup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    const parsed = groupCreateRequestSchema.safeParse({
      ...form,
      maxSize: Number(form.maxSize),
      budgetInr: Number(form.budgetInr),
    });
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

    setSaving(true);
    try {
      await api.createGroup(parsed.data);
      await queryClient.invalidateQueries({ queryKey: ['groups', 'mine'] });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.body.message : 'Could not create your group post.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="group-create-page">
      <header className="group-create-nav">
        <Link to="/dashboard" aria-label="Back to dashboard"><Logo /></Link>
        <Link className="quiet-link" to="/dashboard">Back to dashboard ↗</Link>
      </header>
      <section className="group-create-shell">
        <div className="group-create-intro">
          <p className="eyebrow">Group owner · M2</p>
          <h1>Create a group<br /><em>worth joining.</em></h1>
          <p>Share the plan you have in mind and find the right people for the journey.</p>
          <div className="group-rules"><span>✦</span><div><strong>Built for your trip window</strong><small>Destinations are limited to the Nomad data pack · 1–20 April 2027.</small></div></div>
        </div>
        <form className="group-form" onSubmit={submit} noValidate>
          <div className="group-form-heading"><p className="eyebrow">Your group post</p><h2>Set the details.</h2></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <label>Group name <input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Kyoto Spring Temples" aria-invalid={Boolean(fieldErrors.name)} />{fieldErrors.name && <small className="field-error">{fieldErrors.name}</small>}</label>
          <label>Destination <select value={form.city} onChange={(event) => update('city', event.target.value as typeof form.city)}>{DESTINATION_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}</select>{fieldErrors.city && <small className="field-error">{fieldErrors.city}</small>}</label>
          <div className="group-form-grid">
            <label>Check-in <input type="date" min={GROUP_DATE_MIN} max={GROUP_DATE_MAX} value={form.checkIn} onChange={(event) => update('checkIn', event.target.value)} aria-invalid={Boolean(fieldErrors.checkIn)} />{fieldErrors.checkIn && <small className="field-error">{fieldErrors.checkIn}</small>}</label>
            <label>Check-out <input type="date" min={GROUP_DATE_MIN} max={GROUP_DATE_MAX} value={form.checkOut} onChange={(event) => update('checkOut', event.target.value)} aria-invalid={Boolean(fieldErrors.checkOut)} />{fieldErrors.checkOut && <small className="field-error">{fieldErrors.checkOut}</small>}</label>
          </div>
          <div className="group-form-grid">
            <label>People wanted <select value={form.maxSize} onChange={(event) => update('maxSize', event.target.value)}>{[1, 2, 3, 4].map((size) => <option key={size} value={size}>{size} total {size === 1 ? 'person' : 'people'}</option>)}</select>{fieldErrors.maxSize && <small className="field-error">{fieldErrors.maxSize}</small>}</label>
            <label>Approx. budget per person <div className="money-input"><span>₹</span><input inputMode="numeric" type="number" min="1" step="1" value={form.budgetInr} onChange={(event) => update('budgetInr', event.target.value)} placeholder="60000" aria-invalid={Boolean(fieldErrors.budgetInr)} /></div>{fieldErrors.budgetInr && <small className="field-error">{fieldErrors.budgetInr}</small>}</label>
          </div>
          <label>Proposed itinerary <textarea value={form.itinerary} onChange={(event) => update('itinerary', event.target.value)} placeholder="Tell travellers what the days could look like…" rows={5} aria-invalid={Boolean(fieldErrors.itinerary)} />{fieldErrors.itinerary && <small className="field-error">{fieldErrors.itinerary}</small>}</label>
          <button className="button group-submit" type="submit" disabled={saving}>{saving ? 'Publishing…' : 'Publish group post'} <span>↗</span></button>
        </form>
      </section>
    </main>
  );
}
