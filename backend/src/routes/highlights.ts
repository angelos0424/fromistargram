import { FastifyInstance } from 'fastify';
import { HighlightMedia } from '@prisma/client';
import { prisma } from '../db/client.js';
import { buildImgproxyUrl } from '../utils/imgproxy.js';

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
                                coverUrl: { type: 'string' },
                                media: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            filename: { type: 'string' },
                                            mime: { type: 'string' },
                                            orderIndex: { type: 'number' },
                                            url: { type: 'string' },
                                            thumbnailUrl: { type: 'string' }
                                        },
                                        required: ['id', 'filename', 'mime', 'orderIndex', 'url', 'thumbnailUrl']
                                    }
                                }
                            },
                            required: ['id', 'title', 'media', 'coverUrl']
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

            return highlights.map((highlight) => {
                // Map media items to include signed URLs
                const mediaWithUrls = highlight.media.map((m) => {
                    const source = `local:///${accountId}/${m.filename}`;
                    
                    // Full URL (Original or high quality)
                    const url = buildImgproxyUrl(source) ?? '';
                    
                    // Thumbnail URL (Resized)
                    const thumbnailUrl = buildImgproxyUrl(source, {
                         resize: { width: 320, type: 'fit' }
                    }) ?? '';

                    return {
                        ...m,
                        url,
                        thumbnailUrl
                    };
                });

                // Determine cover URL (use the first media item's thumbnail as cover)
                let coverUrl = '';
                if (mediaWithUrls.length > 0) {
                    coverUrl = mediaWithUrls[0].thumbnailUrl;
                }

                return {
                    id: highlight.id,
                    title: highlight.title,
                    coverUrl,
                    media: mediaWithUrls
                };
            });
        }
    );
}
