import { Link } from 'react-router-dom';

export function Landing() {
  // TODO: NOMAD branding and styling.
  return (
    <main>
      <h1>NOMAD</h1>
      <p>Find your travel group.</p>
      <Link to="/signup">Sign Up</Link> <Link to="/signin">Sign In</Link>
    </main>
  );
}
