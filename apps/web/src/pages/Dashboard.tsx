import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { updateUsernameRequestSchema } from '@nomad/shared';
import type { DashboardOption, Group, PublicUser } from '@nomad/shared';
import { api, ApiError } from '../lib/api';
import { useDashboard } from '../lib/useMe';
import { useMyGroups } from '../lib/useGroups';
import { Logo } from '../components/Logo';

export function Dashboard() {
  const { data, isLoading } = useDashboard();
  const { data: myGroupsData } = useMyGroups();
  const [activeTab, setActiveTab] = useState<'overview' | 'profile'>('overview');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = data?.user;

  async function signOut() {
    await api.logout().catch(() => undefined);
    queryClient.removeQueries({ queryKey: ['me'] });
    queryClient.removeQueries({ queryKey: ['dashboard'] });
    queryClient.removeQueries({ queryKey: ['groups'] });
    navigate('/');
  }

  const initials = user?.username.slice(0, 1).toUpperCase() ?? 'N';
  return <main className="dashboard-page"><aside className="dashboard-sidebar"><div><Logo dark className="dashboard-logo" /><div className="sidebar-label">YOUR SPACE</div><nav className="dashboard-nav"><button className={activeTab === 'overview' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('overview')}><span>◈</span> Overview</button><button className={activeTab === 'profile' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('profile')}><span>◉</span> Profile</button></nav></div><div className="sidebar-bottom"><div className="sidebar-trip"><span className="sidebar-trip-icon">✦</span><p>Ready to find<br /><em>your people?</em></p><button onClick={() => setActiveTab('overview')}>Start exploring ↗</button></div><button className="sign-out" onClick={signOut}>↪ <span>Sign out</span></button></div></aside><section className="dashboard-main"><header className="dashboard-topbar"><div><p className="eyebrow">{activeTab === 'profile' ? 'Your Nomad identity' : 'Your travel space'}</p><h1>{activeTab === 'profile' ? 'Profile' : 'Welcome back'}<span className="topbar-period"> / {isLoading ? '...' : user?.username}</span></h1></div><button className="dashboard-avatar" onClick={() => setActiveTab('profile')} aria-label="Open profile">{initials}</button></header>{activeTab === 'profile' ? <ProfileTab user={user} /> : <OverviewTab user={user} options={data?.options ?? []} groups={myGroupsData?.groups ?? []} onProfile={() => setActiveTab('profile')} onCreateGroup={() => navigate('/groups/new')} />}</section></main>;
}

function OverviewTab({ user, options, groups, onProfile, onCreateGroup }: { user?: PublicUser; options: DashboardOption[]; groups: Group[]; onProfile: () => void; onCreateGroup: () => void }) {
  const canCreate = options.includes('group_creator');
  const canSeek = options.includes('group_seeker');
  return <div className="dashboard-content"><section className="welcome-card"><div><p className="eyebrow">A new kind of travel starts here</p><h2>Where will you<br /><em>go together?</em></h2><p>Build a crew around the things you love, then make a plan worth leaving home for.</p><button className="button" type="button" onClick={onCreateGroup}>Create a group <span>↗</span></button></div><div className="welcome-orbit"><span>✦</span><i>TRAVEL<br />CURIOUS</i></div></section><div className="dashboard-section-heading"><div><p className="eyebrow">Your options</p><h2>Choose your way in.</h2></div><button className="inline-action" onClick={onProfile}>View profile ↗</button></div><div className="overview-grid">{canCreate ? <Link className="overview-stat group-create-link" to="/groups/new" aria-label="Create a group"><span className="stat-icon">＋</span><small>GROUP CREATOR</small><strong>Create a group</strong><p>Start a trip and invite your people.</p></Link> : <article className="overview-stat unavailable"><span className="stat-icon">＋</span><small>GROUP CREATOR</small><strong>Create a group</strong><p>Unavailable for this account.</p></article>}<article className={canSeek ? 'overview-stat' : 'overview-stat unavailable'}><span className="stat-icon">◎</span><small>GROUP SEEKER</small><strong>Find a group</strong><p>{canSeek ? 'Discover travellers heading your way.' : 'Unavailable for this account.'}</p></article><article className="overview-stat warm"><span className="stat-icon">✦</span><small>ACCOUNT</small><strong>{user?.username ?? 'Nomad traveller'}</strong><p>Identity synced from your Nomad account.</p></article></div>{groups.length > 0 && <section className="my-groups"><div className="dashboard-section-heading"><div><p className="eyebrow">Your posts</p><h2>Groups you’re leading.</h2></div><button className="inline-action" onClick={onCreateGroup}>New group ↗</button></div><div className="group-list">{groups.map((group) => <article className="group-list-card" key={group.id}><div><span className="group-list-city">{group.city} · {group.checkIn} → {group.checkOut}</span><h3>{group.name}</h3><p>{group.itinerary || 'No itinerary added yet.'}</p></div><strong>₹{group.budgetInr.toLocaleString('en-IN')}<small> per person</small></strong></article>)}</div></section>}</div>;
}

function ProfileTab({ user }: { user?: PublicUser }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user?.username ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canEdit = (user?.usernameEditCount ?? 1) < 1;
  const memberSince = user?.createdAt ? new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(user.createdAt)) : '—';
  const initials = user?.username.slice(0, 1).toUpperCase() ?? 'N';

  async function saveUsername() {
    const parsed = updateUsernameRequestSchema.safeParse({ username: draft });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Choose a valid username.'); return; }
    setSaving(true); setError('');
    try {
      await api.updateUsername(parsed.data);
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.body.message : 'Could not update your username.');
    } finally { setSaving(false); }
  }

  return <div className="dashboard-content profile-content"><section className="profile-hero"><div className="profile-avatar">{initials}</div><div><span className="profile-status"><i /> Active account</span><h2>{user?.username ?? 'Nomad traveller'}</h2><p>Your Nomad identity, all in one place.</p></div><div className="profile-hero-mark">✦</div></section><div className="dashboard-section-heading profile-heading"><div><p className="eyebrow">Account details</p><h2>The details that keep you connected.</h2></div><span className="details-source">Synced from your account</span></div><section className="details-card"><div className="detail-row username-detail"><span className="detail-icon">@</span><span className="detail-label">Username</span>{editing ? <div className="username-editor"><input value={draft} onChange={e => setDraft(e.target.value)} autoFocus aria-label="New username" /><div><button className="button button-small" type="button" onClick={saveUsername} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button><button className="cancel-edit" type="button" onClick={() => { setEditing(false); setError(''); setDraft(user?.username ?? ''); }}>Cancel</button></div></div> : <strong>{user?.username ?? '—'}</strong>} {!editing && canEdit ? <button className="edit-username" type="button" onClick={() => { setDraft(user?.username ?? ''); setEditing(true); }}>Edit once</button> : !editing && <span className="username-locked">Locked</span>}<span className="detail-check">✓</span></div>{error && <p className="username-error" role="alert">{error}</p>}<DetailRow label="Email address" value={user?.email ?? '—'} icon="✉" /><DetailRow label="Member since" value={memberSince} icon="◷" /><DetailRow label="Account ID" value={user?.id ? `${user.id.slice(0, 8)}…` : '—'} icon="#" last /></section><section className="profile-note"><span>✦</span><div><strong>{canEdit ? 'You can edit your username once.' : 'Your username is locked.'}</strong><p>{canEdit ? 'Make it personal now, or keep the automatically created name.' : 'Your one username edit has already been used.'}</p></div><button type="button" disabled>{canEdit ? '1 edit left' : 'Saved'}</button></section></div>;
}

function DetailRow({ label, value, icon, last = false }: { label: string; value: string; icon: string; last?: boolean }) {
  return <div className={last ? 'detail-row last' : 'detail-row'}><span className="detail-icon">{icon}</span><span className="detail-label">{label}</span><strong>{value}</strong><span className="detail-check">✓</span></div>;
}
