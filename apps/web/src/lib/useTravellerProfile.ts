import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from './api';

export function useTravellerProfile(id: string) {
  return useQuery({
    queryKey: ['travellers', id],
    queryFn: () => api.getTravellerProfile(id),
    enabled: Boolean(id),
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
  });
}
