import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMe } from '../lib/useMe';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoading, isError } = useMe();
  if (isLoading) return <p>Loading…</p>;
  if (isError) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}
