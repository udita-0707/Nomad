import { useQuery } from '@tanstack/react-query';
import { api } from './api';

// Saved profile of the signed-in user. data.profile is null until it is saved.
export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: api.profile });
}
