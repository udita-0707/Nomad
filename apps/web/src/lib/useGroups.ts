import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export function useMyGroups() {
  return useQuery({ queryKey: ['groups', 'mine'], queryFn: api.myGroups });
}
