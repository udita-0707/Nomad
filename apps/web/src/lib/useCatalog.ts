import { useQuery } from '@tanstack/react-query';
import { api } from './api';

// Cities, interests and the date window. Never changes while the app runs.
export function useCatalog() {
  return useQuery({ queryKey: ['catalog'], queryFn: api.getCatalog, staleTime: Infinity });
}
