export const THUMB_BASE_URL = 'https://fromistargram.ddunddun.shop/api/image-proxy';

type ResizeType = 'fit' | 'fill' | 'auto';

interface ImageOptions {
    width?: number;
    height?: number;
    type?: ResizeType;
}

/**
 * Generates an Imagor URL for a given local file path.
 * URL format: /unsafe/fit-in/{width}x{height}/filters:format(webp)/{path}
 */
export function getImagorUrl(
    accountId: string,
    filename: string,
    options: ImageOptions = {}
): string {
    // If filename is already a full URL (e.g. returned from backend signed) or an API path, return it as is.
    if (filename.startsWith('http') || filename.startsWith('/api')) {
        return filename;
    }

    const { width = 0, height = 0 } = options;

    // Construct path: accountId/filename
    const path = `${accountId}/${filename}`;

    const parts: string[] = [];

    if (width > 0 || height > 0) {
        parts.push(`fit-in/${width}x${height}`);
    }

    // Check if it is a video file (simple extension check)
    const isVideo = filename.toLowerCase().endsWith('.mp4');
    const format = isVideo ? 'jpeg' : 'webp';

    parts.push(`filters:format(${format})`);
    parts.push(path);

    return `${THUMB_BASE_URL}/${parts.join('/')}`;
}

interface ResponsiveImageProps {
    src: string;
    srcSet: string;
}

/**
 * Generates src and srcSet props for responsive images.
 */
export function getResponsiveImageProps(
    accountId: string,
    filename: string,
    widths: number[] = [300, 600, 1080],
    aspectRatio?: number
): ResponsiveImageProps {
    // If filename is a full URL, we can't resize it responsibly without re-signing.
    // So we return the single URL for all sizes.
    if (filename.startsWith('http') || filename.startsWith('/api')) {
        return {
            src: filename,
            srcSet: `${filename} 1080w`
        };
    }

    // Base src uses the largest width
    const maxWidth = Math.max(...widths);
    const baseHeight = aspectRatio ? Math.round(maxWidth / aspectRatio) : 0;

    const src = getImagorUrl(accountId, filename, { width: maxWidth, height: baseHeight });

    const srcSet = widths
        .map((w) => {
            const h = aspectRatio ? Math.round(w / aspectRatio) : 0;
            const url = getImagorUrl(accountId, filename, { width: w, height: h });
            return `${url} ${w}w`;
        })
        .join(', ');

    return { src, srcSet };
}
