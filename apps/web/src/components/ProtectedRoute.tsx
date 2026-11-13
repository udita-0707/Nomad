import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMe } from '../lib/useMe';
import { useProfile } from '../lib/useProfile';

export function ProtectedRoute({ children, requireProfile = false }: { children: ReactNode; requireProfile?: boolean }) {
  const { isLoading, isError } = useMe();
  const profile = useProfile();
  if (isLoading) return <p>Loading…</p>;
  if (isError) return <Navigate to="/signin" replace />;
  if (requireProfile && profile.isLoading) return <p>Loading your profile…</p>;
  if (requireProfile && !profile.data?.profile) return <Navigate to="/profile" replace />;
  return <>{children}</>;
}
