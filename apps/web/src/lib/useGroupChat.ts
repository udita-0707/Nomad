import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatMessage } from '@nomad/shared';
import { api, ApiError } from './api';

const POLL_MS = 4000;
const isClientError = (err: unknown) => err instanceof ApiError && err.status < 500;

// S1: the newest page of the group chat, polled every 4s while the tab is visible
// (React Query pauses refetchInterval in a hidden tab). Polling stops on a 4xx.
// The page always refetches the newest messages, so nothing is skipped (no after-cursor, S1-c).
export function useChatLatest(id: string) {
  return useQuery({
    queryKey: ['groups', id, 'messages', 'latest'],
    queryFn: () => api.getMessages(id),
    refetchInterval: (query) => (isClientError(query.state.error) ? false : POLL_MS),
    refetchOnWindowFocus: true,
    retry: (count, err) => !isClientError(err) && count < 2,
  });
}

// "Load earlier": the page of messages older than the smallest id on screen.
export function useLoadEarlier(id: string) {
  return useMutation({ mutationFn: (before: number) => api.getMessages(id, before) });
}

// POST a message. The caller merges it at once (onSent), then the latest page refreshes.
export function useSendMessage(id: string, onSent: (message: ChatMessage) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.postMessage(id, body),
    onSuccess: (res) => {
      onSent(res.message);
      queryClient.invalidateQueries({ queryKey: ['groups', id, 'messages', 'latest'] });
    },
  });
}
