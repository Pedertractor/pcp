import z from 'zod';
import { Unit } from '../generated/prisma/enums.js';
import { listRolesResponseSchema, userRoleSchema } from './user-role.schema.js';

const idParamSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, 'ID deve ser um número inteiro positivo')
    .min(1, 'ID do usuário inválido')
    .transform(Number),
});

export const userSchema = z.object({
  id: z.number(),
  email: z.string().nullable(),
  cardNumber: z.string(),
  unit: z.enum(Unit),
  employeeId: z.number(),
  name: z.string().nullable(),
  firstLogin: z.boolean(),
  status: z.boolean(),
  role: userRoleSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type PublicUser = z.infer<typeof userSchema>;

export const loginBodySchema = z.object({
  cardNumber: z
    .string()
    .regex(/^\d+$/, 'Informe um número de cartão válido.')
    .min(1, 'Informe o número do cartão.')
    .max(8, 'Número de cartão inválido.'),
  unit: z.enum(Unit),
  password: z.string().min(1, 'Informe a senha.'),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const loginResponseSchema = z.object({
  user: userSchema,
});

export const changePasswordBodySchema = z.object({
  password: z.string().min(1, 'Informe a nova senha'),
});

export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;

export const changePasswordParamsSchema = idParamSchema;

export type ChangePasswordParams = z.infer<typeof changePasswordParamsSchema>;

export const changePasswordResponseSchema = z.object({
  user: userSchema,
  message: z.string(),
});

export const listUsersResponseSchema = z.array(userSchema);

const employeeDesignationSchema = z.object({
  sector: z.object({
    name: z.string(),
    costCenter: z.string().optional(),
  }),
  position: z.object({
    name: z.string(),
  }),
});

export const employeeInfoResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  cardNumber: z.string(),
  unit: z.enum(Unit),
  status: z.boolean().optional(),
  Designation: z.array(employeeDesignationSchema).optional(),
});

export type EmployeeInfoResponse = z.infer<typeof employeeInfoResponseSchema>;

export const employeeInfoQuerySchema = z.object({
  card: z.string().trim().min(1, 'Informe o cartão.'),
  unit: z.enum(Unit),
});

export type EmployeeInfoQuery = z.infer<typeof employeeInfoQuerySchema>;

export const createUserBodySchema = z.object({
  cardNumber: z.string().regex(/^\d+$/).min(1).max(16),
  unit: z.enum(Unit),
  role: userRoleSchema,
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;

export const createUserResponseSchema = userSchema;

export const userIdParamsSchema = idParamSchema;

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

export const updateUserRoleBodySchema = z.object({
  role: userRoleSchema,
});

export type UpdateUserRoleBody = z.infer<typeof updateUserRoleBodySchema>;

export { listRolesResponseSchema };

export const getUserByEmployeeIdParamsSchema = z.object({
  employeeId: z.coerce.number().positive(),
});

export type GetUserByEmployeeIdParams = z.infer<
  typeof getUserByEmployeeIdParamsSchema
>;

export const csrfResponseSchema = z.object({
  csrfToken: z.string(),
});
