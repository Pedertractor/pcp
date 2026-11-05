import type { FastifyInstance } from 'fastify';
import z from 'zod';
import { USER_ADMINISTRATION_ROLES } from '../lib/user-roles.js';
import {
  activateUserController,
  changePasswordController,
  createUserController,
  getEmployeeInfoController,
  getMyUserController,
  getUserByEmployeeIdController,
  inactivateUserController,
  listRolesController,
  listUsersController,
  loginController,
  logoutController,
  refreshController,
  resetUserPasswordController,
  updateUserRoleController,
} from '../controllers/user.controller.js';
import {
  changePasswordBodySchema,
  changePasswordParamsSchema,
  changePasswordResponseSchema,
  createUserBodySchema,
  createUserResponseSchema,
  employeeInfoQuerySchema,
  employeeInfoResponseSchema,
  getUserByEmployeeIdParamsSchema,
  listRolesResponseSchema,
  listUsersResponseSchema,
  loginBodySchema,
  loginResponseSchema,
  type ChangePasswordBody,
  type ChangePasswordParams,
  type CreateUserBody,
  type EmployeeInfoQuery,
  type GetUserByEmployeeIdParams,
  type LoginBody,
  type UpdateUserRoleBody,
  type UserIdParams,
  updateUserRoleBodySchema,
  userIdParamsSchema,
  userSchema,
} from '../schemas/user.schemas.js';
import { commonErrors } from '../schemas/error.schemas.js';

export function userRoutes(fastify: FastifyInstance) {
  fastify.get(
    '',
    {
      schema: {
        summary: 'List all users',
        tags: ['User'],
        security: [{ cookieAuth: [] }],
        response: {
          200: listUsersResponseSchema.describe(
            'List all users success response',
          ),
          ...commonErrors,
        },
      },
      onRequest: [
        fastify.authenticate,
        fastify.authorize(...USER_ADMINISTRATION_ROLES),
      ],
    },
    listUsersController,
  );

  fastify.get(
    '/me',
    {
      schema: {
        summary: 'Get my user data',
        tags: ['User'],
        security: [{ cookieAuth: [] }],
        response: {
          200: userSchema.describe('Get my user data success response'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    getMyUserController,
  );

  fastify.get(
    '/roles',
    {
      schema: {
        summary: 'List user roles',
        tags: ['User'],
        security: [{ cookieAuth: [] }],
        response: {
          200: listRolesResponseSchema.describe('List roles success response'),
          ...commonErrors,
        },
      },
      onRequest: [
        fastify.authenticate,
        fastify.authorize(...USER_ADMINISTRATION_ROLES),
      ],
    },
    listRolesController,
  );

  fastify.get<{ Querystring: EmployeeInfoQuery }>(
    '/employee-info',
    {
      schema: {
        summary: 'Get employee info by card and unit from the base API',
        tags: ['User'],
        security: [{ cookieAuth: [] }],
        querystring: employeeInfoQuerySchema,
        response: {
          200: employeeInfoResponseSchema.describe(
            'Employee info success response',
          ),
          ...commonErrors,
        },
      },
      onRequest: [
        fastify.authenticate,
        fastify.authorize(...USER_ADMINISTRATION_ROLES),
      ],
    },
    getEmployeeInfoController,
  );

  fastify.post<{ Body: LoginBody }>(
    '/login',
    {
      schema: {
        summary: 'User login',
        tags: ['User'],
        body: loginBodySchema,
        response: {
          200: loginResponseSchema.describe('Login success response'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.csrfProtection],
    },
    loginController,
  );

  fastify.post(
    '/logout',
    {
      schema: {
        summary: 'User logout',
        tags: ['User'],
        security: [{ cookieAuth: [] }],
        response: {
          204: z.null().describe('Logged out'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    logoutController,
  );

  fastify.post(
    '/refresh',
    {
      schema: {
        summary: 'Rotate refresh token and issue new access token',
        tags: ['User'],
        response: {
          200: loginResponseSchema.describe('Refresh success response'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.csrfProtection],
    },
    refreshController,
  );

  fastify.patch<{
    Params: ChangePasswordParams;
    Body: ChangePasswordBody;
  }>(
    '/:id/password',
    {
      schema: {
        summary: 'Change user password on first login',
        tags: ['User'],
        security: [{ cookieAuth: [] }],
        params: changePasswordParamsSchema,
        body: changePasswordBodySchema,
        response: {
          200: changePasswordResponseSchema.describe(
            'Change password success response',
          ),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    changePasswordController,
  );

  fastify.post<{ Params: ChangePasswordParams }>(
    '/:id/reset-password',
    {
      schema: {
        summary: 'Reset user password',
        tags: ['User'],
        security: [{ cookieAuth: [] }],
        params: changePasswordParamsSchema,
        response: {
          204: z.null().describe('Password reset successfully'),
          ...commonErrors,
        },
      },
      onRequest: [
        fastify.authenticate,
        fastify.authorize(...USER_ADMINISTRATION_ROLES),
        fastify.csrfProtection,
      ],
    },
    resetUserPasswordController,
  );

  fastify.post<{ Body: CreateUserBody }>(
    '/create',
    {
      schema: {
        summary: 'Create a new user',
        tags: ['User'],
        security: [{ cookieAuth: [] }],
        body: createUserBodySchema,
        response: {
          201: createUserResponseSchema.describe('User created'),
          ...commonErrors,
        },
      },
      onRequest: [
        fastify.authenticate,
        fastify.authorize(...USER_ADMINISTRATION_ROLES),
        fastify.csrfProtection,
      ],
    },
    createUserController,
  );

  fastify.post<{ Params: UserIdParams }>(
    '/:id/inactivate',
    {
      schema: {
        summary: 'Inactivate a user',
        tags: ['User'],
        security: [{ cookieAuth: [] }],
        params: userIdParamsSchema,
        response: {
          204: z.null().describe('User inactivated'),
          ...commonErrors,
        },
      },
      onRequest: [
        fastify.authenticate,
        fastify.authorize(...USER_ADMINISTRATION_ROLES),
        fastify.csrfProtection,
      ],
    },
    inactivateUserController,
  );

  fastify.post<{ Params: UserIdParams }>(
    '/:id/activate',
    {
      schema: {
        summary: 'Activate a user',
        tags: ['User'],
        security: [{ cookieAuth: [] }],
        params: userIdParamsSchema,
        response: {
          204: z.null().describe('User activated'),
          ...commonErrors,
        },
      },
      onRequest: [
        fastify.authenticate,
        fastify.authorize(...USER_ADMINISTRATION_ROLES),
        fastify.csrfProtection,
      ],
    },
    activateUserController,
  );

  fastify.patch<{ Params: UserIdParams; Body: UpdateUserRoleBody }>(
    '/:id/role',
    {
      schema: {
        summary: 'Update user role',
        tags: ['User'],
        security: [{ cookieAuth: [] }],
        params: userIdParamsSchema,
        body: updateUserRoleBodySchema,
        response: {
          204: z.null().describe('User role updated'),
          ...commonErrors,
        },
      },
      onRequest: [
        fastify.authenticate,
        fastify.authorize(...USER_ADMINISTRATION_ROLES),
        fastify.csrfProtection,
      ],
    },
    updateUserRoleController,
  );

  fastify.get<{ Params: GetUserByEmployeeIdParams }>(
    '/employee-id/:employeeId',
    {
      schema: {
        summary: 'Get user by employee id',
        tags: ['User'],
        security: [{ cookieAuth: [] }],
        params: getUserByEmployeeIdParamsSchema,
        response: {
          200: userSchema.describe('Get user by employee id success response'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    getUserByEmployeeIdController,
  );
}
