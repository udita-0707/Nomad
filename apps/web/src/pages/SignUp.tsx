import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginRequestSchema, signupRequestSchema } from '@nomad/shared';
import { api, ApiError } from '../lib/api';

export function SignUp() {
  return <AuthPage mode="signup" />;
}

export function AuthPage({ mode }: { mode: 'signup' | 'signin' }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSignup = mode === 'signup';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const parsed = isSignup
      ? signupRequestSchema.safeParse({ email, password })
      : loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details and try again.');
      return;
    }
    setLoading(true);
    try {
      if (isSignup) await api.signup({ email: parsed.data.email, password: parsed.data.password });
      else await api.login({ email: parsed.data.email, password: parsed.data.password });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.body.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page">
    <div className="auth-art"><Link className="brand brand-light" to="/"><span className="brand-mark">N</span> nomad</Link><div className="auth-quote"><span>“</span><h2>The best<br />stories are<br /><em>shared.</em></h2><small>— Somewhere between here<br />&nbsp;&nbsp;&nbsp;&nbsp;and everywhere</small></div><div className="auth-art-footer">KYOTO · TOKYO · DUBAI · BEYOND</div></div>
    <div className="auth-panel"><Link className="mobile-brand brand" to="/"><span className="brand-mark">N</span> nomad</Link><div className="auth-content"><p className="eyebrow">Welcome to Nomad</p><h1>{isSignup ? 'Start your next chapter.' : 'Welcome back, traveller.'}</h1><p className="auth-subtitle">{isSignup ? 'Create your account and find your people.' : 'Your next adventure is still waiting.'}</p><form className="auth-form" onSubmit={submit} noValidate>
      <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
      <label>Password<div className="password-wrap"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={isSignup ? 'At least 8 characters' : 'Your password'} autoComplete={isSignup ? 'new-password' : 'current-password'} /><button type="button" className="show-password" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 12s3.4-5.2 9.8-5.2S21.8 12 21.8 12 18.4 17.2 12 17.2 2.2 12 2.2 12Z" /><circle cx="12" cy="12" r="2.7" />{showPassword && <path d="m4 4 16 16" />}</svg></button></div></label>
      {error && <p className="form-error" role="alert">{error}</p>}<button className="button form-submit" disabled={loading}>{loading ? 'One moment…' : isSignup ? 'Create my account ↗' : 'Sign in ↗'}</button><p className="auth-switch">{isSignup ? 'Already have an account?' : 'New to Nomad?'} <Link to={isSignup ? '/signin' : '/signup'}>{isSignup ? 'Sign in' : 'Create an account'}</Link></p>
    </form></div></div>
  </main>;
}
