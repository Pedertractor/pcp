import z from 'zod';
import { UserRole } from '../generated/prisma/enums.js';

const userRoleValues = Object.values(UserRole) as [
  (typeof UserRole)[keyof typeof UserRole],
  ...(typeof UserRole)[keyof typeof UserRole][],
];

export const userRoleSchema = z.enum(userRoleValues);

export const listRolesResponseSchema = z.array(userRoleSchema);
