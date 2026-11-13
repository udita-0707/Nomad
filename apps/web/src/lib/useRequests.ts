import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export function useGroupRequests(groupId: string) {
  return useQuery({ queryKey: ['groups', groupId, 'requests'], queryFn: () => api.getGroupRequests(groupId), enabled: Boolean(groupId) });
}

export function useRequestToJoin() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ groupId, searchId }: { groupId: string; searchId: string }) => api.requestToJoin(groupId, searchId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId, 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'mine'] });
    } });
}

export function useDecideGroupRequest() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ groupId, travellerId, status }: { groupId: string; travellerId: string; status: 'approved' | 'rejected' }) => api.decideGroupRequest(groupId, travellerId, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId, 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['searches'] });
    } });
}

// Owner view: everyone with a row in the group (owner, approved, pending, rejected), oldest first.
export function useGroupRoster(groupId: string) {
  return useQuery({ queryKey: ['groups', groupId, 'requests', 'all'], queryFn: () => api.getGroupRequests(groupId, 'all'), enabled: Boolean(groupId) });
}
