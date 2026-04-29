import { FastifyInstance } from 'fastify';
import { getIndexerStatus, scheduleIndexerRun, triggerIndexerRun } from '../services/indexerService.js';
import {
  getUploadedReconcilerStatus,
  scheduleUploadedReconcile,
  triggerUploadedReconcile
} from '../services/uploadedReconcilerService.js';
import { sendSuccess } from '../utils/response.js';

const indexerStatusSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['idle', 'running', 'success', 'failure'] },
    lastStartedAt: { type: ['string', 'null'], format: 'date-time' },
    lastFinishedAt: { type: ['string', 'null'], format: 'date-time' },
    lastError: { type: ['string', 'null'] },
    running: { type: 'boolean' }
  },
  required: ['status', 'lastStartedAt', 'lastFinishedAt', 'lastError', 'running'],
  additionalProperties: false
} as const;

const statusResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: true },
    data: indexerStatusSchema
  },
  required: ['success', 'data'],
  additionalProperties: false
} as const;

const uploadedReconcileResultSchema = {
  type: 'object',
  properties: {
    scannedFiles: { type: 'number' },
    dbRowsScanned: { type: 'number' },
    missingFileRows: { type: 'number' },
    orphanFiles: { type: 'number' },
    orphanFilesDeleted: { type: 'number' },
    deletedDbRowsPruned: { type: 'number' },
    sizeRecalculated: { type: 'number' }
  },
  required: [
    'scannedFiles',
    'dbRowsScanned',
    'missingFileRows',
    'orphanFiles',
    'orphanFilesDeleted',
    'deletedDbRowsPruned',
    'sizeRecalculated'
  ],
  additionalProperties: false
} as const;

const uploadedReconcilerStatusSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['idle', 'running', 'success', 'failure'] },
    lastStartedAt: { type: ['string', 'null'], format: 'date-time' },
    lastFinishedAt: { type: ['string', 'null'], format: 'date-time' },
    lastError: { type: ['string', 'null'] },
    running: { type: 'boolean' },
    lastResult: { anyOf: [uploadedReconcileResultSchema, { type: 'null' }] }
  },
  required: ['status', 'lastStartedAt', 'lastFinishedAt', 'lastError', 'running', 'lastResult'],
  additionalProperties: false
} as const;

const uploadedStatusResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: true },
    data: uploadedReconcilerStatusSchema
  },
  required: ['success', 'data'],
  additionalProperties: false
} as const;

export async function registerAdminIndexerRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/admin/indexer',
    {
      schema: {
        tags: ['AdminIndexer'],
        response: {
          200: statusResponseSchema
        }
      }
    },
    async (request, reply) => {
      return sendSuccess(reply, getIndexerStatus());
    }
  );

  app.get(
    '/api/admin/uploaded-reconciler',
    {
      schema: {
        tags: ['AdminIndexer'],
        response: {
          200: uploadedStatusResponseSchema
        }
      }
    },
    async (_request, reply) => {
      return sendSuccess(reply, getUploadedReconcilerStatus());
    }
  );

  app.post(
    '/api/admin/indexer/run',
    {
      schema: {
        tags: ['AdminIndexer'],
        response: {
          202: statusResponseSchema
        }
      }
    },
    async (_request, reply) => {
      scheduleIndexerRun('manual-trigger');
      if (process.env.NODE_ENV === 'test') {
        await triggerIndexerRun('manual-trigger');
      }
      return sendSuccess(reply, getIndexerStatus(), 202);
    }
  );

  app.post(
    '/api/admin/uploaded-reconciler/run',
    {
      schema: {
        tags: ['AdminIndexer'],
        body: {
          type: 'object',
          properties: {
            dryRun: { type: 'boolean' },
            cleanOrphanOlderThanDays: { type: 'number', minimum: 0 },
            pruneDeletedDbOlderThanDays: { type: 'number', minimum: 0 },
            recalculateSize: { type: 'boolean' }
          },
          additionalProperties: false
        },
        response: {
          202: uploadedStatusResponseSchema
        }
      }
    },
    async (request, reply) => {
      const options = (request.body ?? {}) as {
        dryRun?: boolean;
        cleanOrphanOlderThanDays?: number;
        pruneDeletedDbOlderThanDays?: number;
        recalculateSize?: boolean;
      };

      scheduleUploadedReconcile('manual-trigger', options);
      if (process.env.NODE_ENV === 'test') {
        await triggerUploadedReconcile('manual-trigger', options);
      }

      return sendSuccess(reply, getUploadedReconcilerStatus(), 202);
    }
  );
}
