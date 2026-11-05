import type { FastifyInstance } from 'fastify';
import {
  createBlockController,
  getBlockController,
  getBlockPlanImageController,
  listBlocksController,
  updateBlockCostCentersController,
  uploadBlockPlanImageController,
} from '../controllers/block.controller.js';
import { syncBlockPlanningFromXlsController } from '../controllers/planning-sync.controller.js';
import {
  clearMachineMapPositionController,
  updateMachineMapPositionController,
} from '../controllers/machine-map.controller.js';
import {
  blockDetailSchema,
  blockIdParamsSchema,
  createBlockBodySchema,
  listBlocksResponseSchema,
  updateBlockCostCentersBodySchema,
  type BlockIdParams,
  type CreateBlockBody,
  type UpdateBlockCostCentersBody,
} from '../schemas/block.schemas.js';
import {
  planningSyncResultSchema,
} from '../schemas/planning-sync.schemas.js';
import {
  machineMapPositionBodySchema,
  machineMapPositionParamsSchema,
  machineMapPositionResponseSchema,
  type MachineMapPositionBody,
  type MachineMapPositionParams,
} from '../schemas/machine-map.schemas.js';
import { commonErrors, errorSchema } from '../schemas/error.schemas.js';

export function blockRoutes(fastify: FastifyInstance) {
  fastify.get(
    '',
    {
      schema: {
        summary: 'List production blocks',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        response: {
          200: listBlocksResponseSchema.describe('List blocks success response'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    listBlocksController,
  );

  fastify.get<{ Params: BlockIdParams }>(
    '/:id',
    {
      schema: {
        summary: 'Get production block',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockIdParamsSchema,
        response: {
          200: blockDetailSchema.describe('Get block success response'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    getBlockController,
  );

  fastify.post<{ Body: CreateBlockBody }>(
    '',
    {
      schema: {
        summary: 'Create production block',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        body: createBlockBodySchema,
        response: {
          201: blockDetailSchema.describe('Block created'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    createBlockController,
  );

  fastify.put<{ Params: BlockIdParams; Body: UpdateBlockCostCentersBody }>(
    '/:id/cost-centers',
    {
      schema: {
        summary: 'Replace the cost centers linked to the block',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockIdParamsSchema,
        body: updateBlockCostCentersBodySchema,
        response: {
          200: blockDetailSchema.describe('Cost centers updated'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    updateBlockCostCentersController,
  );

  fastify.post<{ Params: BlockIdParams }>(
    '/:id/plan-image',
    {
      schema: {
        summary: 'Upload or replace the block plan image',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        consumes: ['multipart/form-data'],
        params: blockIdParamsSchema,
        response: {
          200: blockDetailSchema.describe('Plan image updated'),
          ...commonErrors,
          413: errorSchema.describe('Payload Too Large'),
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    uploadBlockPlanImageController,
  );

  fastify.post<{ Params: BlockIdParams }>(
    '/:id/planning-sync',
    {
      schema: {
        summary: 'Import planning rows from XLS (simulates base API)',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        consumes: ['multipart/form-data'],
        params: blockIdParamsSchema,
        response: {
          200: planningSyncResultSchema.describe('Planning sync result'),
          ...commonErrors,
          413: errorSchema.describe('Payload Too Large'),
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    syncBlockPlanningFromXlsController,
  );

  fastify.patch<{ Params: MachineMapPositionParams; Body: MachineMapPositionBody }>(
    '/:id/machines/:machineId/map-position',
    {
      schema: {
        summary: 'Save machine position on the block plan',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: machineMapPositionParamsSchema,
        body: machineMapPositionBodySchema,
        response: {
          200: machineMapPositionResponseSchema,
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    updateMachineMapPositionController,
  );

  fastify.delete<{ Params: MachineMapPositionParams }>(
    '/:id/machines/:machineId/map-position',
    {
      schema: {
        summary: 'Remove machine from the block plan map',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: machineMapPositionParamsSchema,
        response: {
          200: machineMapPositionResponseSchema,
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    clearMachineMapPositionController,
  );

  fastify.get<{ Params: BlockIdParams }>(
    '/:id/plan-image',
    {
      schema: {
        summary: 'Get the block plan image file',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockIdParamsSchema,
      },
      onRequest: [fastify.authenticate],
    },
    getBlockPlanImageController,
  );
}
