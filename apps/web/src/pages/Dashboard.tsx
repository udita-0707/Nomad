import { Link, Navigate } from 'react-router-dom';
import { useMe } from '../lib/useMe';
import { useProfile } from '../lib/useProfile';

// TODO: switch to api.dashboard() once GET /api/dashboard is implemented.
// TODO: wire Group Creator / Group Seeker to their pages (iteration 2), add logout.
export function Dashboard() {
  const { data } = useMe();
  const profile = useProfile();
  if (profile.isLoading) return <p>Loading…</p>;
  // New users set up their profile first (M1).
  if (profile.data && !profile.data.profile) return <Navigate to="/profile" replace />;
  return (
    <main>
      <h1>Welcome, {profile.data?.profile?.name ?? data?.user.username}</h1>
      <p>Your username: {data?.user.username}</p>
      <button type="button">Group Creator</button>
      <button type="button">Group Seeker</button>
      <p>
        <Link to="/profile">Edit profile</Link>
      </p>
    </main>
  );
}
