import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { HotelSearchFilters } from '@nomad/shared';
import { api, ApiError } from './api';

// GET /api/groups/:id/hotels. Prices depend on the members count, so they are never
// kept fresh on the client: each visit or filter change asks the server again.
export function useGroupHotels(id: string, filters: HotelSearchFilters) {
  return useQuery({
    queryKey: ['groups', id, 'hotels', filters],
    queryFn: () => api.getGroupHotels(id, filters),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
  });
}
