import { useMe } from '../lib/useMe';

// TODO: switch to api.dashboard() once GET /api/dashboard is implemented.
// TODO: wire Group Creator / Group Seeker to their pages (iteration 2), add logout.
export function Dashboard() {
  const { data } = useMe();
  return (
    <main>
      <h1>Welcome, {data?.user.username}</h1>
      <button type="button">Group Creator</button>
      <button type="button">Group Seeker</button>
    </main>
  );
}
