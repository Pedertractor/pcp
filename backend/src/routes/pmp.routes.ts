import type { FastifyInstance } from 'fastify';
import {
  createPmpBlockController,
  getPmpBlockController,
  getPmpBlockThemeImageController,
  getPmpWeeklyGoalController,
  listPmpBlocksController,
  listPmpBlockWeeksController,
  listPmpWeeklyGoalsController,
  updatePmpBlockController,
  uploadPmpBlockThemeImageController,
} from '../controllers/pmp-block.controller.js';
import { commonErrors } from '../schemas/error.schemas.js';
import {
  createPmpBlockBodySchema,
  listPmpBlocksResponseSchema,
  pmpBlockIdParamsSchema,
  pmpBlockSummarySchema,
  updatePmpBlockBodySchema,
  type CreatePmpBlockBody,
  type PmpBlockIdParams,
  type UpdatePmpBlockBody,
} from '../schemas/pmp-block.schemas.js';
import {
  listPmpBlockWeeksResponseSchema,
  listPmpWeeklyGoalsResponseSchema,
  pmpWeeklyGoalDetailSchema,
  pmpWeeklyGoalParamsSchema,
  pmpWeeklyGoalsQuerySchema,
  type PmpWeeklyGoalParams,
  type PmpWeeklyGoalsQuery,
} from '../schemas/pmp-goal.schemas.js';

export function pmpRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: PmpBlockIdParams }>(
    '/blocks/:id/weeks',
    {
      schema: {
        summary: 'List weeks that have weekly goals in the PMP block',
        tags: ['PMP'],
        security: [{ cookieAuth: [] }],
        params: pmpBlockIdParamsSchema,
        response: {
          200: listPmpBlockWeeksResponseSchema.describe('Weeks with goals'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    listPmpBlockWeeksController,
  );

  fastify.get<{ Params: PmpBlockIdParams; Querystring: PmpWeeklyGoalsQuery }>(
    '/blocks/:id/weekly-goals',
    {
      schema: {
        summary: 'List weekly goals (parts) of a PMP block for one week',
        tags: ['PMP'],
        security: [{ cookieAuth: [] }],
        params: pmpBlockIdParamsSchema,
        querystring: pmpWeeklyGoalsQuerySchema,
        response: {
          200: listPmpWeeklyGoalsResponseSchema.describe('Weekly goals'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    listPmpWeeklyGoalsController,
  );

  fastify.get<{ Params: PmpWeeklyGoalParams }>(
    '/blocks/:id/weekly-goals/:goalId',
    {
      schema: {
        summary: 'Get weekly goal with daily distribution',
        tags: ['PMP'],
        security: [{ cookieAuth: [] }],
        params: pmpWeeklyGoalParamsSchema,
        response: {
          200: pmpWeeklyGoalDetailSchema.describe('Weekly goal detail'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    getPmpWeeklyGoalController,
  );

  fastify.get(
    '/blocks',
    {
      schema: {
        summary: 'List PMP blocks',
        tags: ['PMP'],
        security: [{ cookieAuth: [] }],
        response: {
          200: listPmpBlocksResponseSchema.describe('List PMP blocks'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    listPmpBlocksController,
  );

  fastify.get<{ Params: PmpBlockIdParams }>(
    '/blocks/:id',
    {
      schema: {
        summary: 'Get PMP block',
        tags: ['PMP'],
        security: [{ cookieAuth: [] }],
        params: pmpBlockIdParamsSchema,
        response: {
          200: pmpBlockSummarySchema.describe('PMP block detail'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    getPmpBlockController,
  );

  fastify.post<{ Body: CreatePmpBlockBody }>(
    '/blocks',
    {
      schema: {
        summary: 'Create PMP block',
        tags: ['PMP'],
        security: [{ cookieAuth: [] }],
        body: createPmpBlockBodySchema,
        response: {
          201: pmpBlockSummarySchema.describe('PMP block created'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    createPmpBlockController,
  );

  fastify.post<{ Params: PmpBlockIdParams }>(
    '/blocks/:id/theme-image',
    {
      schema: {
        summary: 'Upload thematic image for PMP block (PNG/WEBP, transparent)',
        tags: ['PMP'],
        security: [{ cookieAuth: [] }],
        params: pmpBlockIdParamsSchema,
        response: {
          200: pmpBlockSummarySchema.describe('Theme image uploaded'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    uploadPmpBlockThemeImageController,
  );

  fastify.get<{ Params: PmpBlockIdParams }>(
    '/blocks/:id/theme-image',
    {
      schema: {
        summary: 'Get PMP block thematic image file',
        tags: ['PMP'],
        security: [{ cookieAuth: [] }],
        params: pmpBlockIdParamsSchema,
        response: {
          200: { type: 'string', format: 'binary' },
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    getPmpBlockThemeImageController,
  );

  fastify.put<{ Params: PmpBlockIdParams; Body: UpdatePmpBlockBody }>(
    '/blocks/:id',
    {
      schema: {
        summary: 'Update PMP block (name, cost centers, operations)',
        tags: ['PMP'],
        security: [{ cookieAuth: [] }],
        params: pmpBlockIdParamsSchema,
        body: updatePmpBlockBodySchema,
        response: {
          200: pmpBlockSummarySchema.describe('PMP block updated'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    updatePmpBlockController,
  );
}
