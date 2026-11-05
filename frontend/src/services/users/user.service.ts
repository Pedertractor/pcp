import { HttpClientError, httpClient } from '@/lib/http-client';
import type {
  CreateUserInput,
  EmployeeInfo,
  PublicUser,
  UserRole,
} from '@/types/user';
import type { Unit } from '@/types/unit';

export const usersListQueryKey = ['users', 'list'] as const;
export const userRolesQueryKey = ['users', 'roles'] as const;

export function employeeQueryKey(card: string, unit: Unit) {
  return ['users', 'employee-info', card.trim(), unit] as const;
}

export async function listUsers(): Promise<PublicUser[]> {
  return httpClient.get<PublicUser[]>('/users');
}

export async function listUserRoles(): Promise<UserRole[]> {
  return httpClient.get<UserRole[]>('/users/roles');
}

export async function fetchEmployeeByCardAndUnitOrNull(
  card: string,
  unit: Unit,
): Promise<EmployeeInfo | null> {
  try {
    return await httpClient.get<EmployeeInfo>('/users/employee-info', {
      params: { card: card.trim(), unit },
    });
  } catch (error) {
    if (error instanceof HttpClientError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  return httpClient.post<PublicUser, CreateUserInput>('/users/create', input);
}

export async function resetUserPassword(userId: number): Promise<void> {
  await httpClient.post<void>(`/users/${userId}/reset-password`);
}

export async function updateUserRole(
  userId: number,
  role: UserRole,
): Promise<void> {
  await httpClient.patch<void, { role: UserRole }>(`/users/${userId}/role`, {
    role,
  });
}

export async function activateUser(userId: number): Promise<void> {
  await httpClient.post<void>(`/users/${userId}/activate`);
}

export async function inactivateUser(userId: number): Promise<void> {
  await httpClient.post<void>(`/users/${userId}/inactivate`);
}
