import type { Unit } from '@/types/unit';

export type UserRole = 'ADMIN' | 'PCP_OPERATOR';

export const USER_ROLES = ['PCP_OPERATOR', 'ADMIN'] as const satisfies readonly UserRole[];

export type PublicUser = {
  id: number;
  email: string | null;
  cardNumber: string;
  unit: Unit;
  employeeId: number;
  name: string | null;
  firstLogin: boolean;
  status: boolean;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LoginInput = {
  cardNumber: string;
  password: string;
  unit: Unit;
};

export type LoginResponse = {
  user: PublicUser;
};

export type ChangePasswordInput = {
  password: string;
};

export type ChangePasswordResponse = {
  user: PublicUser;
  message: string;
};

export type CsrfTokenResponse = {
  csrfToken: string;
};

export type CreateUserInput = {
  cardNumber: string;
  unit: Unit;
  role: UserRole;
};

export type EmployeeInfo = {
  id: number;
  name: string;
  cardNumber: string;
  unit: Unit;
  status?: boolean;
  Designation?: Array<{
    sector: { name: string; costCenter?: string };
    position: { name: string };
  }>;
};
