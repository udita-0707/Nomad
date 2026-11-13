import type {
  CatalogResponse,
  DashboardResponse,
  ErrorResponse,
  HealthResponse,
  BookingRequest,
  BookingResponse,
  HotelOptionsResponse,
  HotelSearchFilters,
  LoginRequest,
  ProfileInput,
  ProfileResponse,
  SignupRequest,
  GroupCreateRequest,
  GroupResponse,
  GroupsResponse,
  JoinRequestResponse,
  JoinRequestsResponse,
  SearchRequest,
  SearchResponse,
  UpdateUsernameRequest,
  UserResponse,
} from '@nomad/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: ErrorResponse['error'],
  ) {
    super(body.message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? { code: 'INTERNAL', message: res.statusText });
  }
  return data as T;
}

export const api = {
  health: () => request<HealthResponse>('/health'),
  signup: (body: SignupRequest) =>
    request<UserResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: LoginRequest) =>
    request<UserResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<UserResponse>('/auth/me'),
  updateUsername: (body: UpdateUsernameRequest) => request<UserResponse>('/auth/profile/username', { method: 'PATCH', body: JSON.stringify(body) }),
  dashboard: () => request<DashboardResponse>('/dashboard'),
  profile: () => request<ProfileResponse>('/profile'),
  saveProfile: (body: ProfileInput) =>
    request<ProfileResponse>('/profile', { method: 'PUT', body: JSON.stringify(body) }),
  myGroups: () => request<GroupsResponse>('/groups/mine'),
  createGroup: (body: GroupCreateRequest) =>
    request<GroupResponse>('/groups', { method: 'POST', body: JSON.stringify(body) }),
  getCatalog: () => request<CatalogResponse>('/catalog'),
  createSearch: (body: SearchRequest) =>
    request<SearchResponse>('/searches', { method: 'POST', body: JSON.stringify(body) }),
  getSearchMatches: (id: string) => request<SearchResponse>(`/searches/${encodeURIComponent(id)}/matches`),
  requestToJoin: (groupId: string, searchId: string) => request<JoinRequestResponse>(`/groups/${encodeURIComponent(groupId)}/requests`, { method: 'POST', body: JSON.stringify({ searchId }) }),
  getGroupRequests: (groupId: string, status: 'pending' | 'all' = 'pending') => request<JoinRequestsResponse>(`/groups/${encodeURIComponent(groupId)}/requests?status=${status}`),
  decideGroupRequest: (groupId: string, travellerId: string, status: 'approved' | 'rejected') => request<JoinRequestResponse>(`/groups/${encodeURIComponent(groupId)}/requests/${encodeURIComponent(travellerId)}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  cancelJoinRequest: (groupId: string) => request<void>(`/groups/${encodeURIComponent(groupId)}/requests/me`, { method: 'DELETE' }),
  getGroupHotels: (id: string, filters: HotelSearchFilters) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value !== undefined && query.set(key, String(value)));
    return request<HotelOptionsResponse>(`/groups/${encodeURIComponent(id)}/hotels?${query}`);
  },
  getBooking: (id: string) => request<BookingResponse>(`/groups/${encodeURIComponent(id)}/booking`),
  bookGroup: (id: string, body: BookingRequest) =>
    request<BookingResponse>(`/groups/${encodeURIComponent(id)}/booking`, { method: 'POST', body: JSON.stringify(body) }),
};
