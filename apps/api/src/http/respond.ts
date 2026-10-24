import type { FastifyReply } from 'fastify';
import type { ZodType } from 'zod';

/**
 * Sends a response only after the DTO schema accepts it. A programming error
 * becomes a 500 instead of leaking an unexpected shape to the front end.
 */
export function sendDto<T>(
  reply: FastifyReply,
  schema: ZodType<T>,
  payload: T,
  statusCode = 200,
): void {
  reply.code(statusCode).send(schema.parse(payload));
}
