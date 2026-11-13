import { useQuery } from '@tanstack/react-query';
import { api } from './api';

// Current user. Errors with 401 when signed out.
export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: api.me });
}
