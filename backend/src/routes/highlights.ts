import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';

export async function registerHighlightRoutes(app: FastifyInstance) {
    app.get<{ Params: { accountId: string } }>(
        '/api/accounts/:accountId/highlights',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        accountId: { type: 'string' }
                    },
                    required: ['accountId']
                },
                response: {
                    200: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                title: { type: 'string' },
                                media: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            filename: { type: 'string' },
                                            mime: { type: 'string' },
                                            orderIndex: { type: 'number' }
                                        },
                                        required: ['id', 'filename', 'mime', 'orderIndex']
                                    }
                                }
                            },
                            required: ['id', 'title', 'media']
                        }
                    }
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
