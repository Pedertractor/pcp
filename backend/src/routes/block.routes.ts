import type { FastifyInstance } from 'fastify';
import {
  createBlockController,
  getBlockController,
  getBlockPlanImageController,
  listBlocksController,
  updateBlockCostCentersController,
  uploadBlockPlanImageController,
} from '../controllers/block.controller.js';
import {
  listBlockPaintColorsController,
  updateBlockPaintColorController,
} from '../controllers/paint-color.controller.js';
import { syncBlockPlanningFromXlsController } from '../controllers/planning-sync.controller.js';
import { listBlockProductionOrdersController } from '../controllers/production-order.controller.js';
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
import { planningSyncResultSchema } from '../schemas/planning-sync.schemas.js';
import { blockProductionOrdersListResponseSchema } from '../schemas/production-order.schemas.js';
import {
  blockPaintColorItemSchema,
  blockPaintColorParamsSchema,
  blockPaintColorsListResponseSchema,
  updateBlockPaintColorBodySchema,
  type BlockPaintColorParams,
  type UpdateBlockPaintColorBody,
} from '../schemas/paint-color.schemas.js';
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

  fastify.get<{ Params: BlockIdParams }>(
    '/:id/production-orders',
    {
      schema: {
        summary: 'List production orders of the block with their sync dates',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockIdParamsSchema,
        response: {
          200: blockProductionOrdersListResponseSchema.describe(
            'Production orders for block',
          ),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    listBlockProductionOrdersController,
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
    '/:id/paint-colors',
    {
      schema: {
        summary: 'List paint colors used by the block with optional map hex',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockIdParamsSchema,
        response: {
          200: blockPaintColorsListResponseSchema.describe(
            'Paint colors for block',
          ),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate],
    },
    listBlockPaintColorsController,
  );

  fastify.patch<{ Params: BlockPaintColorParams; Body: UpdateBlockPaintColorBody }>(
    '/:id/paint-colors/:colorId',
    {
      schema: {
        summary: 'Set the map display color (hex) for a paint color in this block',
        tags: ['Block'],
        security: [{ cookieAuth: [] }],
        params: blockPaintColorParamsSchema,
        body: updateBlockPaintColorBodySchema,
        response: {
          200: blockPaintColorItemSchema.describe('Updated paint color link'),
          ...commonErrors,
        },
      },
      onRequest: [fastify.authenticate, fastify.csrfProtection],
    },
    updateBlockPaintColorController,
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
