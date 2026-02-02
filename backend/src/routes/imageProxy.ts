import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { signPath } from '../utils/imagor.js';

const imagorUrl = process.env.IMAGOR_URL;
const publicApiUrl = process.env.PUBLIC_API_BASE_URL;

function getPublicBaseUrl(request: FastifyRequest): string {
    if (publicApiUrl) {
        return publicApiUrl;
    }

    const forwardedProto = request.headers['x-forwarded-proto'];
    const forwardedHost = request.headers['x-forwarded-host'];
    const protocol = Array.isArray(forwardedProto)
        ? forwardedProto[0]
        : forwardedProto ?? request.protocol ?? 'http';
    const host = Array.isArray(forwardedHost)
        ? forwardedHost[0]
        : forwardedHost ?? request.headers.host;
    return host ? `${protocol}://${host}` : '';
}

export async function registerImageProxyRoutes(app: FastifyInstance) {
    app.get('/api/image-proxy/*', async (request: FastifyRequest, reply: FastifyReply) => {
        const params = request.params as { '*': string };
        const path = params['*'];

        if (!path) {
            return reply.code(400).send({ error: 'Missing path' });
        }

        if (!imagorUrl) {
            request.log.error('IMAGOR_URL is not set');
            return reply.code(500).send({ error: 'Image service not configured' });
        }

        let normalizedPath = path.normalize('NFC');
        // uploaded/ 경로는 imagor local loader가 직접 접근하므로 변환하지 않음

        const isVideo = normalizedPath.toLowerCase().endsWith('.mp4');
        if (isVideo) {
            normalizedPath = normalizedPath.replace('filters:format(webp)', 'filters:format(jpeg)');
        }

        const signature = signPath(normalizedPath);

        if (!signature) {
            const normalizedBase = imagorUrl.endsWith('/') ? imagorUrl.slice(0, -1) : imagorUrl;
            const encodedPath = normalizedPath.split('/').map(p => encodeURIComponent(p)).join('/')
                .replace(/%3A/g, ':');
            return reply.redirect(`${normalizedBase}/unsafe/${encodedPath}`);
        }

        const normalizedBase = imagorUrl.endsWith('/') ? imagorUrl.slice(0, -1) : imagorUrl;

        const encodedPath = normalizedPath.split('/').map(p => encodeURIComponent(p)).join('/')
            .replace(/%3A/g, ':')
            .replace(/%28/g, '(')
            .replace(/%29/g, ')');

        const prefix = isVideo ? '/videos' : '/images';
        const signedUrl = `${normalizedBase}${prefix}/${signature}/${encodedPath}`;

        return reply.redirect(signedUrl);
    });
}
