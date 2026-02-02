import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { signPath } from '../utils/imagor.js';

const imagorUrl = process.env.IMAGOR_URL;

/**
 * Parse Imagor path into transformation and file path parts
 * Example: "fit-in/1080x0/filters:format(webp)/source/rosieline_/filename.jpg"
 * → transformation: "fit-in/1080x0/filters:format(webp)"
 * → filePath: "source/rosieline_/filename.jpg"
 */
function parseImagorPath(path: string): { transformation: string; filePath: string } {
    // Find where the file path starts (after source/ or uploaded/)
    const sourceMatch = path.match(/(source\/|uploaded\/)/);
    if (sourceMatch && sourceMatch.index !== undefined) {
        return {
            transformation: path.slice(0, sourceMatch.index).replace(/\/$/, ''),
            filePath: path.slice(sourceMatch.index),
        };
    }
    // If no recognizable prefix, assume the whole path is a file path (fallback)
    return { transformation: '', filePath: path };
}

/**
 * Encode file path to Base64 with URL-safe characters
 */
function encodeToBase64Path(filePath: string): string {
    return 'b64:' + Buffer.from(filePath).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
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

        const normalizedPath = path.normalize('NFC');

        // Parse the path to extract transformation and file path
        const { transformation, filePath } = parseImagorPath(normalizedPath);

        const isVideo = filePath.toLowerCase().endsWith('.mp4');

        // Adjust format for videos
        let finalTransformation = transformation;
        if (isVideo) {
            finalTransformation = transformation.replace('filters:format(webp)', 'filters:format(jpeg)');
        }

        // Encode file path to Base64
        const b64FilePath = encodeToBase64Path(filePath);

        // Build final path for signing
        const finalPath = finalTransformation ? `${finalTransformation}/${b64FilePath}` : b64FilePath;

        const signature = signPath(finalPath);
        const normalizedBase = imagorUrl.endsWith('/') ? imagorUrl.slice(0, -1) : imagorUrl;
        const prefix = isVideo ? '/videos' : '/images';

        if (!signature) {
            return reply.redirect(`${normalizedBase}${prefix}/unsafe/${finalPath}`);
        }

        const signedUrl = `${normalizedBase}${prefix}/${signature}/${finalPath}`;

        return reply.redirect(signedUrl);
    });
}
