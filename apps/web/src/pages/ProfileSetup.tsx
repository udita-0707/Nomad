import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GENDERS, GENDER_PREFERENCES, HOME_CITIES, INTERESTS, profileRequestSchema, type ProfileInput } from '@nomad/shared';
import { Logo } from '../components/Logo';
import { api, ApiError } from '../lib/api';
import { useProfile } from '../lib/useProfile';

const EMPTY: ProfileInput = { name: '', gender: 'FEMALE', homeCity: 'Bengaluru', interests: [], genderPreference: 'ANY' };

export function ProfileSetup() {
  const navigate = useNavigate();
  const notice = (useLocation().state as { notice?: string } | null)?.notice;
  const queryClient = useQueryClient();
  const { data, isLoading } = useProfile();
  const [form, setForm] = useState<ProfileInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data?.profile) return;
    setForm({ name: data.profile.name, gender: data.profile.gender, homeCity: data.profile.homeCity, interests: data.profile.interests, genderPreference: data.profile.genderPreference });
  }, [data]);

  const save = useMutation({
    mutationFn: api.saveProfile,
    onSuccess: (response) => { queryClient.setQueryData(['profile'], response); navigate('/dashboard', { replace: true }); },
    onError: (error) => { setErrors(error instanceof ApiError ? error.body.fields ?? { form: error.body.message } : { form: 'Could not save your profile.' }); },
  });

  function update<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }

  function toggleInterest(id: ProfileInput['interests'][number]) {
    update('interests', form.interests.includes(id) ? form.interests.filter((interest) => interest !== id) : [...form.interests, id]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = profileRequestSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => { next[issue.path.join('.')] ??= issue.message; });
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  }

  if (isLoading) return <main className="profile-setup-page"><p className="profile-loading">Loading your profile…</p></main>;

  return (
    <main className="profile-setup-page">
      <header className="profile-setup-nav"><Link to="/" aria-label="Nomad home"><Logo /></Link><span className="profile-step">M1 · YOUR PROFILE</span></header>
      <section className="profile-setup-shell">
        <div className="profile-setup-intro"><p className="eyebrow">Welcome to Nomad</p><h1>Tell us a little<br /><em>about you.</em></h1><p>Your profile helps Nomad connect you with people who travel like you do.</p><div className="profile-flow-note"><span>✦</span><div><strong>Your details stay with your account.</strong><small>Complete this once, then continue to your travel space.</small></div></div></div>
        <form className="profile-form" onSubmit={submit} noValidate>
          <div className="profile-form-heading"><p className="eyebrow">M1 · Profile setup</p><h2>Build your traveller profile.</h2></div>
          {notice && <p className="already-signed" role="status">{notice}</p>}
          {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
          <label>Name<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Your name" autoComplete="name" aria-invalid={Boolean(errors.name)} />{errors.name && <small className="field-error">{errors.name}</small>}</label>
          <div className="profile-form-grid"><label>Gender<select value={form.gender} onChange={(event) => update('gender', event.target.value as ProfileInput['gender'])}>{GENDERS.map((gender) => <option key={gender} value={gender}>{gender === 'FEMALE' ? 'Female' : 'Male'}</option>)}</select>{errors.gender && <small className="field-error">{errors.gender}</small>}</label><label>Origin city<select value={form.homeCity} onChange={(event) => update('homeCity', event.target.value as ProfileInput['homeCity'])}>{HOME_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}</select>{errors.homeCity && <small className="field-error">{errors.homeCity}</small>}</label></div>
          <fieldset className="profile-interests"><legend>Personal interests</legend><p>Choose at least one.</p><div className="interest-options">{INTERESTS.map((interest) => <label className={form.interests.includes(interest.id) ? 'interest-option selected' : 'interest-option'} key={interest.id}><input type="checkbox" checked={form.interests.includes(interest.id)} onChange={() => toggleInterest(interest.id)} />{interest.label}</label>)}</div>{errors.interests && <small className="field-error">{errors.interests}</small>}</fieldset>
          <label>Travel with<select value={form.genderPreference} onChange={(event) => update('genderPreference', event.target.value as ProfileInput['genderPreference'])}>{GENDER_PREFERENCES.map((preference) => <option key={preference} value={preference}>{preference === 'ANY' ? 'Anyone' : 'Same gender only'}</option>)}</select>{errors.genderPreference && <small className="field-error">{errors.genderPreference}</small>}</label>
          <button className="button profile-submit" type="submit" disabled={save.isPending}>{save.isPending ? 'Saving profile…' : data?.profile ? 'Save profile' : 'Continue to Nomad'} <span>↗</span></button>
        </form>
      </section>
    </main>
  );
}
