import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GENDERS,
  GENDER_PREFERENCES,
  HOME_CITIES,
  INTERESTS,
  profileRequestSchema,
  type ProfileInput,
} from '@nomad/shared';
import { api, ApiError } from '../lib/api';
import { useProfile } from '../lib/useProfile';

const EMPTY: ProfileInput = {
  name: '',
  gender: 'FEMALE',
  homeCity: 'Bengaluru',
  interests: [],
  genderPreference: 'ANY',
};

// M1: name, gender, origin city and interests. Saved in the database,
// so the form is filled from GET /api/profile after a refresh.
export function ProfileSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useProfile();
  const [form, setForm] = useState<ProfileInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const p = data?.profile;
    if (p) {
      setForm({
        name: p.name,
        gender: p.gender,
        homeCity: p.homeCity,
        interests: p.interests,
        genderPreference: p.genderPreference,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: api.saveProfile,
    onSuccess: (res) => {
      queryClient.setQueryData(['profile'], res);
      navigate('/dashboard');
    },
    onError: (err) => {
      if (err instanceof ApiError) setErrors(err.body.fields ?? { form: err.body.message });
      else setErrors({ form: 'Could not save, please try again' });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = profileRequestSchema.safeParse(form);
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) fields[issue.path.join('.')] ??= issue.message;
      setErrors(fields);
      return;
    }
    setErrors({});
    save.mutate(form);
  }

  function toggleInterest(id: ProfileInput['interests'][number]) {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(id)
        ? f.interests.filter((i) => i !== id)
        : [...f.interests, id],
    }));
  }

  if (isLoading) return <p>Loading…</p>;

  return (
    <main>
      <h1>{data?.profile ? 'Edit your profile' : 'Set up your profile'}</h1>
      <form onSubmit={onSubmit}>
        <p>
          <label>
            Name{' '}
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          {errors.name && <span role="alert"> {errors.name}</span>}
        </p>
        <p>
          <label>
            Gender{' '}
            <select
              value={form.gender}
              onChange={(e) =>
                setForm({ ...form, gender: e.target.value as ProfileInput['gender'] })
              }
            >
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g === 'FEMALE' ? 'Female' : 'Male'}
                </option>
              ))}
            </select>
          </label>
        </p>
        <p>
          <label>
            Origin city{' '}
            <select
              value={form.homeCity}
              onChange={(e) =>
                setForm({ ...form, homeCity: e.target.value as ProfileInput['homeCity'] })
              }
            >
              {HOME_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </p>
        <fieldset>
          <legend>Interests</legend>
          {INTERESTS.map((i) => (
            <label key={i.id} style={{ display: 'inline-block', marginRight: 12 }}>
              <input
                type="checkbox"
                checked={form.interests.includes(i.id)}
                onChange={() => toggleInterest(i.id)}
              />{' '}
              {i.label}
            </label>
          ))}
          {errors.interests && <p role="alert">{errors.interests}</p>}
        </fieldset>
        <p>
          <label>
            Travel with{' '}
            <select
              value={form.genderPreference}
              onChange={(e) =>
                setForm({
                  ...form,
                  genderPreference: e.target.value as ProfileInput['genderPreference'],
                })
              }
            >
              {GENDER_PREFERENCES.map((p) => (
                <option key={p} value={p}>
                  {p === 'ANY' ? 'Anyone' : 'Same gender only'}
                </option>
              ))}
            </select>
          </label>
        </p>
        {errors.form && <p role="alert">{errors.form}</p>}
        <button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </main>
  );
}
