import type { QueryClient } from '@tanstack/react-query';
import { HttpClientError, httpClient, setWebCsrfToken } from '@/lib/http-client';
import type {
  ChangePasswordInput,
  ChangePasswordResponse,
  CsrfTokenResponse,
  LoginInput,
  LoginResponse,
  PublicUser,
} from '@/types/user';

export const webSessionQueryKey = ['auth', 'web-session'] as const;

export async function ensureWebCsrf(): Promise<void> {
  const { csrfToken } = await httpClient.get<CsrfTokenResponse>('/csrf');
  setWebCsrfToken(csrfToken);
}

export async function fetchWebSession(): Promise<PublicUser | null> {
  await ensureWebCsrf();
  try {
    return await getCurrentUser();
  } catch (error) {
    if (error instanceof HttpClientError && error.statusCode === 401) {
      return null;
    }
    throw error;
  }
}

export function clearWebSessionCache(queryClient: QueryClient): void {
  void queryClient.cancelQueries({ queryKey: webSessionQueryKey });
  queryClient.setQueryData<PublicUser | null>(webSessionQueryKey, null);
}

export async function login(payload: LoginInput): Promise<LoginResponse> {
  await ensureWebCsrf();
  return httpClient.post<LoginResponse, LoginInput>('/users/login', payload);
}

export async function changePassword(
  userId: number,
  payload: ChangePasswordInput,
): Promise<ChangePasswordResponse> {
  return httpClient.patch<ChangePasswordResponse, ChangePasswordInput>(
    `/users/${userId}/password`,
    payload,
  );
}

export async function getCurrentUser(): Promise<PublicUser> {
  return httpClient.get<PublicUser>('/users/me');
}

export async function logout(): Promise<void> {
  await httpClient.post<void>('/users/logout');
  setWebCsrfToken(null);
}
