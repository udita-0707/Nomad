import { useMutation } from '@tanstack/react-query';
import { api } from './api';

// POST /api/searches. Saves the search; M4 adds the matches.
export function useCreateSearch() {
  return useMutation({ mutationFn: api.createSearch });
}
