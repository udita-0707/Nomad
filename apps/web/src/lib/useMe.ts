import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { DashboardResponse } from '@nomad/shared';

// Current user. Errors with 401 when signed out.
export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: api.me });
}

export function useDashboard() {
  return useQuery<DashboardResponse>({ queryKey: ['dashboard'], queryFn: api.dashboard });
}
