import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

// GET /api/groups/:id/booking. Every member sees the same saved booking.
export function useBooking(id: string) {
  return useQuery({
    queryKey: ['groups', id, 'booking'],
    queryFn: () => api.getBooking(id),
    retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
  });
}

// POST /api/groups/:id/booking. On success (or ALREADY_BOOKED) the booking and dashboard lists refresh.
export function useBookGroup(id: string) {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['groups', id] });
    queryClient.invalidateQueries({ queryKey: ['groups', 'mine'] });
  };
  return useMutation({
    mutationFn: (roomId: string) => api.bookGroup(id, { roomId }),
    onSuccess: (res) => {
      queryClient.setQueryData(['groups', id, 'booking'], res);
      refresh();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.body.code === 'ALREADY_BOOKED') refresh();
    },
  });
}
