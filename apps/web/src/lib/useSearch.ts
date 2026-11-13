import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MatchFilters } from '@nomad/shared';
import { api, ApiError } from './api';

// POST /api/searches. Seeds the matches query so the results page needs no second fetch.
export function useCreateSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createSearch,
    onSuccess: (res) => {
      queryClient.setQueryData(['searches', res.search.id, 'matches', '', 'ANY'], res);
    },
  });
}

// GET /api/searches/:id/matches. A 404 is final, so it is not retried.
export function useSearchMatches(id: string, filters: MatchFilters = { interests: [], gender: 'ANY' }) {
  const interests = [...filters.interests].sort().join(',');
  return useQuery({
    queryKey: ['searches', id, 'matches', interests, filters.gender],
    queryFn: () => api.getSearchMatches(id, { interests: interests ? interests.split(',') as MatchFilters['interests'] : [], gender: filters.gender }),
    placeholderData: keepPreviousData,
    retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
  });
}
