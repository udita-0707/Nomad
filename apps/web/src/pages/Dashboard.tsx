import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useMe } from '../lib/useMe';

export function Dashboard() {
  const { data, isLoading } = useMe();
  const [activeTab, setActiveTab] = useState<'overview' | 'profile'>('overview');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = data?.user;

  async function signOut() {
    await api.logout().catch(() => undefined);
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    navigate('/');
  }

  const initials = user?.username.slice(0, 1).toUpperCase() ?? 'N';

  return <main className="dashboard-page"><aside className="dashboard-sidebar"><div><a className="brand brand-light" href="/"><span className="brand-mark">N</span> nomad</a><div className="sidebar-label">YOUR SPACE</div><nav className="dashboard-nav"><button className={activeTab === 'overview' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('overview')}><span>◈</span> Overview</button><button className={activeTab === 'profile' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('profile')}><span>◉</span> Profile</button></nav></div><div className="sidebar-bottom"><div className="sidebar-trip"><span className="sidebar-trip-icon">✦</span><p>Ready to find<br /><em>your people?</em></p><button onClick={() => setActiveTab('overview')}>Start exploring ↗</button></div><button className="sign-out" onClick={signOut}>↪ <span>Sign out</span></button></div></aside><section className="dashboard-main"><header className="dashboard-topbar"><div><p className="eyebrow">{activeTab === 'profile' ? 'Your Nomad identity' : 'Your travel space'}</p><h1>{activeTab === 'profile' ? 'Profile' : 'Welcome back'}<span className="topbar-period"> / {isLoading ? '...' : user?.username}</span></h1></div><button className="dashboard-avatar" onClick={() => setActiveTab('profile')} aria-label="Open profile">{initials}</button></header>{activeTab === 'profile' ? <ProfileTab user={user} /> : <OverviewTab user={user} onProfile={() => setActiveTab('profile')} />}</section></main>;
}

function OverviewTab({ user, onProfile }: { user?: { username: string; email: string; createdAt: string }; onProfile: () => void }) {
  return <div className="dashboard-content"><section className="welcome-card"><div><p className="eyebrow">A new kind of travel starts here</p><h2>Where will you<br /><em>go together?</em></h2><p>Build a crew around the things you love, then make a plan worth leaving home for.</p><button className="button" type="button">Find a group <span>↗</span></button></div><div className="welcome-orbit"><span>✦</span><i>TRAVEL<br />CURIOUS</i></div></section><div className="dashboard-section-heading"><div><p className="eyebrow">Your account</p><h2>Everything looks good.</h2></div><button className="inline-action" onClick={onProfile}>View profile ↗</button></div><div className="overview-grid"><article className="overview-stat"><span className="stat-icon">◎</span><small>IDENTITY</small><strong>{user?.username ?? 'Nomad traveller'}</strong><p>Your account is ready to go.</p></article><article className="overview-stat"><span className="stat-icon">✉</span><small>CONTACT</small><strong>{user?.email ?? 'Your email'}</strong><p>Used for your account only.</p></article><article className="overview-stat warm"><span className="stat-icon">✦</span><small>WHAT'S NEXT</small><strong>Find your crew</strong><p>Matching tools are coming into view.</p></article></div></div>;
}

function ProfileTab({ user }: { user?: { id?: string; username: string; email: string; createdAt: string } }) {
  const memberSince = user?.createdAt ? new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(user.createdAt)) : '—';
  const initials = user?.username.slice(0, 1).toUpperCase() ?? 'N';
  return <div className="dashboard-content profile-content"><section className="profile-hero"><div className="profile-avatar">{initials}</div><div><span className="profile-status"><i /> Active account</span><h2>{user?.username ?? 'Nomad traveller'}</h2><p>Your Nomad identity, all in one place.</p></div><div className="profile-hero-mark">✦</div></section><div className="dashboard-section-heading profile-heading"><div><p className="eyebrow">Account details</p><h2>The details that keep you connected.</h2></div><span className="details-source">Synced from your account</span></div><section className="details-card"><DetailRow label="Username" value={user?.username ?? '—'} icon="@" /><DetailRow label="Email address" value={user?.email ?? '—'} icon="✉" /><DetailRow label="Member since" value={memberSince} icon="◷" /><DetailRow label="Account ID" value={user?.id ? `${user.id.slice(0, 8)}…` : '—'} icon="#" last /></section><section className="profile-note"><span>✦</span><div><strong>Your travel profile is next.</strong><p>Once your interests, home city, and travel preferences are connected, this is where your matching identity will come together.</p></div><button type="button" disabled>Coming next</button></section></div>;
}

function DetailRow({ label, value, icon, last = false }: { label: string; value: string; icon: string; last?: boolean }) {
  return <div className={last ? 'detail-row last' : 'detail-row'}><span className="detail-icon">{icon}</span><span className="detail-label">{label}</span><strong>{value}</strong><span className="detail-check">✓</span></div>;
}
