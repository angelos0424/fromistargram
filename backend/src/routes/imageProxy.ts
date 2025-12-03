import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { signPath } from '../utils/imagor.js';

const imagorUrl = process.env.IMAGOR_URL;

export async function registerImageProxyRoutes(app: FastifyInstance) {
    app.get('/api/image-proxy/*', async (request: FastifyRequest, reply: FastifyReply) => {
        const params = request.params as { '*': string };
        const path = params['*'];

        if (!path) {
            return reply.code(400).send({ error: 'Missing path' });
        }

        if (!imagorUrl) {
            // If IMAGOR_URL is not configured, we can't redirect.
            // Fallback or error? Error is safer to indicate misconfiguration.
            request.log.error('IMAGOR_URL is not set');
            return reply.code(500).send({ error: 'Image service not configured' });
        }

        // path is something like "fit-in/300x300/filters:format(webp)/account/image.jpg"

        // 1. Normalize path to NFC (standard for Linux/Web, fixes Mac NFD issues)
        let normalizedPath = path.normalize('NFC');

        // Check if it's a video
        const isVideo = normalizedPath.toLowerCase().endsWith('.mp4');
        if (isVideo) {
            // ImagorVideo might have issues with webp or specific filters.
            // Force jpeg for video thumbnails to be safe.
            normalizedPath = normalizedPath.replace('filters:format(webp)', 'filters:format(jpeg)');
        }

        // 2. Sign the normalized path (Imagor verifies signature on the decoded path)
        const signature = signPath(normalizedPath);

        if (!signature) {
            const normalizedBase = imagorUrl.endsWith('/') ? imagorUrl.slice(0, -1) : imagorUrl;
            // Fallback to unsafe if signing fails
            const encodedPath = normalizedPath.split('/').map(p => encodeURIComponent(p)).join('/')
                .replace(/%3A/g, ':');
            return reply.redirect(`${normalizedBase}/unsafe/${encodedPath}`);
        }

        const normalizedBase = imagorUrl.endsWith('/') ? imagorUrl.slice(0, -1) : imagorUrl;

        // 3. Encode the path for the URL
        // We split by slash and encode each segment to handle spaces/Korean/Emojis correctly
        const encodedPath = normalizedPath.split('/').map(p => encodeURIComponent(p)).join('/')
            .replace(/%3A/g, ':')
            .replace(/%28/g, '(')
            .replace(/%29/g, ')');

        const signedUrl = `${normalizedBase}/${signature}/${encodedPath}`;

        return reply.redirect(signedUrl);

    });
}
