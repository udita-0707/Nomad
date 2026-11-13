import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';

// POST /api/searches. Seeds the matches query so the results page needs no second fetch.
export function useCreateSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createSearch,
    onSuccess: (res) => {
      queryClient.setQueryData(['searches', res.search.id, 'matches'], res);
    },
  });
}

// GET /api/searches/:id/matches. A 404 is final, so it is not retried.
export function useSearchMatches(id: string) {
  return useQuery({
    queryKey: ['searches', id, 'matches'],
    queryFn: () => api.getSearchMatches(id),
    retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
  });
}
