import { Link } from 'react-router-dom';

export function Logo({ dark = false, className = '' }: { dark?: boolean; className?: string }) {
  return <Link className={`nomad-logo ${dark ? 'nomad-logo-dark' : ''} ${className}`} to="/" aria-label="Nomad home"><img src="/assets/nomad-logo.png" alt="Nomad — Find your people. Explore the world." /></Link>;
}
