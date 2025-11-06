import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { FastifyReply } from 'fastify';

export type RangeResponseOptions = {
  filePath: string;
  rangeHeader?: string;
  mimeType?: string | false;
  cacheControl?: string;
};

export async function sendFileWithRange(reply: FastifyReply, options: RangeResponseOptions) {
  const { filePath, rangeHeader, mimeType, cacheControl } = options;
  const stats = await stat(filePath);
  const fileSize = stats.size;

  reply.header('Accept-Ranges', 'bytes');
  reply.header('Last-Modified', stats.mtime.toUTCString());
  reply.header('Cache-Control', cacheControl ?? 'public, max-age=86400, stale-while-revalidate=604800');
  if (mimeType) {
    reply.type(mimeType);
  }

  if (!rangeHeader) {
    reply.header('Content-Length', fileSize);
    return reply.send(createReadStream(filePath));
  }

  const matches = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!matches) {
    reply.header('Content-Length', fileSize);
    return reply.send(createReadStream(filePath));
  }

  const start = matches[1] ? Number.parseInt(matches[1], 10) : 0;
  const end = matches[2] ? Number.parseInt(matches[2], 10) : fileSize - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= fileSize) {
    reply.code(416);
    reply.header('Content-Range', `bytes */${fileSize}`);
    return reply.send();
  }

  const chunkSize = end - start + 1;

  reply.code(206);
  reply.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
  reply.header('Content-Length', chunkSize);

  const stream = createReadStream(filePath, { start, end });
  return reply.send(stream);
}
