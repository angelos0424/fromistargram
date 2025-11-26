import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/client.js';

export async function registerHighlightRoutes(app: FastifyInstance) {
    app.get<{ Params: { accountId: string } }>(
        '/api/accounts/:accountId/highlights',
        {
            schema: {
                params: z.object({
                    accountId: z.string()
                }),
                response: {
                    200: z.array(
                        z.object({
                            id: z.string(),
                            title: z.string(),
                            media: z.array(
                                z.object({
                                    id: z.string(),
                                    filename: z.string(),
                                    mime: z.string(),
                                    orderIndex: z.number()
                                })
                            )
                        })
                    )
                }
            }
        },
        async (request, reply) => {
            const { accountId } = request.params;

            const highlights = await prisma.highlight.findMany({
                where: { accountId },
                include: {
                    media: {
                        orderBy: { orderIndex: 'asc' }
                    }
                },
                orderBy: { title: 'asc' }
            });

            return highlights;
        }
    );
}
