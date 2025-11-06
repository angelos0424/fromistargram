import { constants } from 'fs';
import { access } from 'fs/promises';
import path from 'path';
import { FastifyInstance } from 'fastify';
import { lookup } from 'mime-types';
import { z } from 'zod';
import { sendFileWithRange } from '../utils/range.js';

const paramsSchema = z.object({
  account: z.string().min(1),
  filename: z.string().min(1)
});

export async function registerMediaRoutes(app: FastifyInstance): Promise<void> {
  const dataRoot = process.env.MEDIA_ROOT ?? '/root';

  app.get('/api/media/:account/:filename', async (request, reply) => {
    const { account, filename } = paramsSchema.parse(request.params);
    const filePath = path.join(dataRoot, account, filename);

    try {
      await access(filePath, constants.R_OK);
    } catch (error) {
      app.log.warn(error, 'Media not found: %s', filePath);
      return reply.code(404).send({ message: 'Media not found' });
    }

    const mimeType = lookup(filename) || 'application/octet-stream';
    return sendFileWithRange(reply, {
      filePath,
      rangeHeader: request.headers.range,
      mimeType
    });
  });
}
