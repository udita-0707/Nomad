import { Link, useNavigate, useParams } from 'react-router-dom';
import { INTERESTS, type ProfileGroup, type TravellerProfileResponse } from '@nomad/shared';
import { Logo } from '../components/Logo';
import { ApiError } from '../lib/api';
import { useCatalog } from '../lib/useCatalog';
import { useTravellerProfile } from '../lib/useTravellerProfile';

function formatDate(date: string, timeZone?: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(new Date(`${date}T12:00:00Z`));
}

export function TravellerProfilePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: profile, isLoading, error } = useTravellerProfile(id);
  const { data: catalog } = useCatalog();
  const notFound = error instanceof ApiError && error.status === 404;
  const goBack = () => window.history.length > 1 ? navigate(-1) : navigate('/dashboard');

  return <main className="group-create-page"><header className="group-create-nav"><Link to="/dashboard" aria-label="Back to dashboard"><Logo /></Link><button className="quiet-link profile-back" type="button" onClick={goBack}>Back ↗</button></header><section className="traveller-profile-page">
    {isLoading && <div className="skeleton skeleton-title" aria-busy="true" />}
    {notFound && <div className="matches-empty"><span>✦</span><h2>Traveller not found</h2><p>This profile is unavailable or is not visible to you.</p><button className="button button-small" type="button" onClick={goBack}>Back to where you came from <span>↗</span></button></div>}
    {error && !notFound && !isLoading && <p className="form-error" role="alert">Could not load this traveller profile. Please try again.</p>}
    {profile && <ProfileContent profile={profile} timeZones={new Map((catalog?.destinationCities ?? []).map((city) => [city.name, city.timezone]))} />}
  </section></main>;
}

function ProfileContent({ profile, timeZones }: { profile: TravellerProfileResponse; timeZones: Map<string, string> }) {
  const labels = new Map(INTERESTS.map((interest) => [interest.id, interest.label]));
  const shared = new Set(profile.sharedInterests);
  return <div className="traveller-profile-content"><section className="traveller-profile-hero"><div className="profile-avatar">{profile.traveller.name.slice(0, 1).toUpperCase()}</div><div><p className="eyebrow">Traveller profile</p><h1>{profile.traveller.name}</h1>{profile.isMe && <span className="status-badge status-approved">This is you</span>}</div></section><section className="details-card traveller-details"><div className="detail-row"><span className="detail-label">Age</span><strong>{profile.traveller.age ?? 'Age not shared'}</strong></div><div className="detail-row"><span className="detail-label">Home city</span><strong>{profile.traveller.homeCity}{profile.traveller.homeAirport ? ` · ${profile.traveller.homeAirport}` : ''}</strong></div><div className="selected-interests"><span className="detail-label">Interests</span><div className="selected-interest-list">{profile.traveller.interests.map((interest) => <span className={shared.has(interest) ? 'shared-interest' : ''} key={interest}>{labels.get(interest) ?? interest}</span>)}</div>{!profile.isMe && <small className="profile-shared-note">You share {profile.sharedInterests.length} {profile.sharedInterests.length === 1 ? 'interest' : 'interests'}.</small>}</div></section>{profile.isMe && <Link className="inline-action" to="/profile">Edit profile ↗</Link>}<section className="traveller-groups"><div className="dashboard-section-heading"><div><p className="eyebrow">Approved groups</p><h2>{profile.groups.length ? 'Trips they’re part of.' : 'Not in any group yet.'}</h2></div></div>{profile.groups.map((group) => <GroupCard key={group.id} group={group} timeZone={timeZones.get(group.city)} />)}</section></div>;
}

function GroupCard({ group, timeZone }: { group: ProfileGroup; timeZone?: string }) {
  return <article className="group-list-card traveller-group-card"><div><span className="group-list-city">{group.city} · {formatDate(group.checkIn, timeZone)} → {formatDate(group.checkOut, timeZone)}</span><h3>{group.name}</h3><p><span className="status-badge status-approved">{group.role === 'owner' ? 'Owner' : 'Member'}</span> · {group.membersCount}/{group.maxSize} travellers {group.booked && <span className="status-badge status-booked">Booked</span>}</p></div></article>;
}
