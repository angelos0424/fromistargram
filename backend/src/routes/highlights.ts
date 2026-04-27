import { FastifyInstance } from 'fastify';
import { HighlightMedia } from '@prisma/client';
import { prisma } from '../db/client.js';
import { buildImagorUrl } from '../utils/imagor.js';
import { sendSuccess } from '../utils/response.js';

function buildHighlightMediaUrl(accountId: string, filename: string): string {
    const safeAccount = encodeURIComponent(accountId);
    const safePath = filename.split(/[\\/]/g).map((part) => encodeURIComponent(part)).join('/');
    return `/api/media/${safeAccount}/${safePath}`;
}

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
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', const: true },
                            data: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        title: { type: 'string' },
                                        coverUrl: { type: 'string' },
                                        coverMedia: {
                                            type: 'object',
                                            nullable: true,
                                            properties: {
                                                id: { type: 'string' },
                                                filename: { type: 'string' },
                                                mime: { type: 'string' },
                                                orderIndex: { type: 'number' },
                                                rawUrl: { type: 'string' },
                                                url: { type: 'string' },
                                                thumbnailUrl: { type: 'string' }
                                            },
                                            required: ['id', 'filename', 'mime', 'orderIndex', 'rawUrl', 'url', 'thumbnailUrl']
                                        },
                                        media: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'string' },
                                                    filename: { type: 'string' },
                                                    mime: { type: 'string' },
                                                    orderIndex: { type: 'number' },
                                                    rawUrl: { type: 'string' },
                                                    url: { type: 'string' },
                                                    thumbnailUrl: { type: 'string' }
                                                },
                                                required: ['id', 'filename', 'mime', 'orderIndex', 'rawUrl', 'url', 'thumbnailUrl']
                                            }
                                        }
                                    },
                                    required: ['id', 'title', 'media', 'coverUrl']
                                }
                            }
                        },
                        required: ['success', 'data']
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
                    },
                    coverMedia: true
                },
                orderBy: { title: 'asc' }
            });

            const data = highlights.map((highlight) => {
                // Map media items to include signed URLs
                const mapMedia = (m: HighlightMedia) => {
                    const source = `local:///source/${accountId}/${m.filename}`;
                    const mediaUrl = buildHighlightMediaUrl(accountId, m.filename);
                    const isVideo = m.mime.startsWith('video/');

                    // Full URL for images, raw stream URL for videos.
                    const url = isVideo ? mediaUrl : buildImagorUrl(source) ?? mediaUrl;

                    // Thumbnail URL (Resized)
                    const thumbnailUrl = buildImagorUrl(source, {
                        resize: { width: 640, type: 'fit' }
                    }) ?? mediaUrl;

                    return {
                        ...m,
                        rawUrl: mediaUrl,
                        url,
                        thumbnailUrl
                    };
                };

                const mediaWithUrls = highlight.media.map(mapMedia);
                const coverMediaWithUrl = highlight.coverMedia ? mapMedia(highlight.coverMedia) : null;

                // Determine cover URL (use coverMedia if available, otherwise first media item)
                let coverUrl = '';
                if (coverMediaWithUrl) {
                    coverUrl = coverMediaWithUrl.thumbnailUrl;
                } else if (mediaWithUrls.length > 0) {
                    coverUrl = mediaWithUrls[0].thumbnailUrl;
                }

                return {
                    id: highlight.id,
                    title: highlight.title,
                    coverUrl,
                    coverMedia: coverMediaWithUrl,
                    media: mediaWithUrls
                };
            });

            return sendSuccess(reply, data);
        }
    );
}
