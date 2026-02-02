import { FastifyReply } from 'fastify';
import { ApiResponse, ApiError } from '../types/api.js';

export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200,
  meta?: ApiResponse<T>['meta']
) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta,
  };
  return reply.status(statusCode).send(response);
}

export function sendError(
  reply: FastifyReply,
  message: string,
  statusCode = 500,
  code = 'INTERNAL_SERVER_ERROR',
  details?: unknown
) {
  const response: ApiError = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
  return reply.status(statusCode).send(response);
}
