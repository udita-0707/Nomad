import type {
  DashboardResponse,
  ErrorResponse,
  HealthResponse,
  LoginRequest,
  SignupRequest,
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
};
